# nest-json-queue

`nest-json-queue`는 NestJS에서 사용할 수 있는 JSON 파일 기반 영속 큐입니다.  
작업을 디스크에 저장하고, 파일 lock으로 소비를 직렬화해서 별도의 Redis나 메시지 브로커 없이도 간단한 작업 큐를 구성할 수 있습니다.

같은 파일 시스템을 공유하는 환경에서 가장 잘 동작합니다. 컨테이너를 쓴다면 큐 디렉터리를 영속 볼륨에 두는 것을 권장합니다.

## 특징

- 여러 큐를 한 번에 등록할 수 있습니다.
- Producer와 Consumer를 분리할 수 있습니다.
- `jobId`를 직접 주면 중복 enqueue를 피할 수 있습니다.
- 실패한 작업은 `maxAttempts` 범위에서 자동 재시도됩니다.
- 처리 중 멈춘 작업은 `processingTimeout` 기준으로 복구됩니다.
- 완료 / 실패 이력은 개수 제한으로 정리됩니다.
- 자동 소비 루프뿐 아니라 수동 `consume()` 처리도 지원합니다.

## 설치

```bash
npm install nest-json-queue
```

```bash
pnpm add nest-json-queue
```

## 빠른 시작

### 1. 모듈 등록

```ts
import { Module } from '@nestjs/common';
import { JsonQueueModule } from 'nest-json-queue';

@Module({
  imports: [
    JsonQueueModule.forRoot([
      {
        name: 'orders',
        options: {
          basePath: '.queues',
          maxAttempts: 3,
          processingTimeout: 60_000,
          completedLimit: 100,
          failedLimit: 100,
        },
      },
    ]),
  ],
  providers: [OrderProducer, OrderProcessor, OrderService],
})
export class AppModule {}
```

`forRoot()`와 `forRootAsync()`는 global module로 동작합니다.  
`register()`와 `registerAsync()`는 local module이므로, queue를 쓰는 모듈에 직접 import해야 합니다.

### 2. Producer에서 job 추가

```ts
import { InjectJsonQueue, JsonQueue } from 'nest-json-queue';
import { Injectable } from '@nestjs/common';

type OrderJob = {
  orderId: string;
  userId: string;
};

type OrderResult = {
  ok: true;
};

@Injectable()
export class OrderProducer {
  constructor(
    @InjectJsonQueue('orders')
    private readonly queue: JsonQueue<OrderJob, OrderResult>,
  ) {}

  enqueue(orderId: string, userId: string) {
    return this.queue.add({ orderId, userId }, `order-${orderId}`);
  }
}
```

`add(data, jobId?)`는 enqueue된 job id를 반환합니다.  
같은 `jobId`로 다시 넣으면 기존 job id를 그대로 돌려주고 중복 작업을 만들지 않습니다.

### 3. Consumer에서 job 처리

```ts
import { JsonQueueProcessor } from 'nest-json-queue';

type OrderJob = {
  orderId: string;
  userId: string;
};

type OrderResult = {
  ok: true;
};

@JsonQueueProcessor('orders')
export class OrderProcessor {
  constructor(private readonly orderService: OrderService) {}

  async process(job: { id: string; data: OrderJob }) {
    return this.orderService.handle(job.data);
  }

  complete(job: { id: string }, returnValue: OrderResult) {
    console.log('completed', job.id, returnValue);
  }

  failed(job: { id: string }, error: unknown) {
    console.error('failed', job.id, error);
  }
}
```

`@JsonQueueProcessor()`는 클래스에 `@Injectable()`도 함께 적용합니다.  
즉, processor 클래스에는 별도의 `@Injectable()`을 붙이지 않아도 됩니다.

`process(job)`는 필수이고, `complete(job, returnValue)`와 `failed(job, error)`는 선택입니다.  
`process()`가 throw하면 runner가 자동으로 `fail()`을 호출한 뒤 `failed()` 훅을 실행합니다.

### 4. 별도 워커 앱으로 실행

이 패키지는 producer와 consumer를 같은 Nest 앱에 둘 수도 있고, 저장소의 `apps/producer` / `apps/consumer`처럼 별도 애플리케이션 컨텍스트로 분리해서 쓸 수도 있습니다.  
분리해서 쓸 때는 두 앱이 같은 `basePath`를 바라봐야 합니다.

## Async 설정

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JsonQueueModule } from 'nest-json-queue';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JsonQueueModule.forRootAsync([
      {
        name: 'orders',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          basePath: config.get<string>('QUEUE_BASE_PATH') ?? '.queues',
          maxAttempts: 3,
        }),
      },
    ]),
  ],
})
export class AppModule {}
```

`useFactory()`는 큐 옵션 객체를 반환해야 합니다.  
주입할 provider는 `inject`에 넣고, 해당 provider가 현재 module scope에서 보이도록 import를 구성해야 합니다.

## Queue API

`JsonQueue<T, R>`는 아래 메서드를 제공합니다.

| 메서드                         | 설명                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| `add(data, jobId?)`            | 작업을 큐에 추가하고 job id를 반환합니다.                  |
| `consume()`                    | 다음 작업을 꺼냅니다. 비어 있으면 `null`을 반환합니다.     |
| `complete(jobId, returnValue)` | 처리 완료로 마킹하고 결과를 저장합니다.                    |
| `fail(jobId, error)`           | 실패로 마킹합니다. 재시도 가능하면 waiting으로 되돌립니다. |

수동으로 루프를 돌리고 싶다면 이렇게 사용할 수 있습니다.

```ts
const job = await queue.consume();

if (!job) {
  return;
}

try {
  const result = await handle(job.data);
  await queue.complete(job.id, result);
} catch (error) {
  await queue.fail(job.id, error);
}
```

## 옵션

기본 옵션은 `JsonQueueModule`에 넣은 `options` 객체에서 설정합니다.

| 옵션                | 기본값      | 설명                                                                                                          |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `basePath`          | `jsonqueue` | 실제 저장 경로의 부모 디렉터리입니다. 최종 경로는 `process.cwd()/<basePath>/<queue-name-lowercase>`가 됩니다. |
| `maxAttempts`       | `1`         | 총 시도 횟수입니다. `1`이면 재시도하지 않습니다.                                                              |
| `processingTimeout` | `60_000`    | processing 상태가 이 시간보다 오래되면 stale job으로 간주합니다.                                              |
| `lockTimeout`       | `10_000`    | lock 파일이 이 시간보다 오래되면 stale lock으로 판단합니다.                                                   |
| `lockRetryDelay`    | `50`        | lock 획득 실패 시 다시 시도하기까지의 대기 시간(ms)입니다.                                                    |
| `completedLimit`    | `1000`      | 완료 이력으로 유지할 최대 파일 수입니다.                                                                      |
| `failedLimit`       | `1000`      | 실패 이력으로 유지할 최대 파일 수입니다.                                                                      |

### 주의할 점

- `maxAttempts`는 재시도 횟수가 아니라 총 시도 횟수입니다.
- `processingTimeout`은 다음 `consume()` 시점에 stale job 복구가 일어납니다.
- `completedLimit` / `failedLimit`가 `0` 이하이면 해당 이력을 모두 삭제합니다.
- queue name은 디스크 경로에서 소문자로 저장되므로, 대소문자만 다른 이름은 피하는 것이 좋습니다.
- `jobId`는 파일명 일부로 사용되므로 filesystem-safe 값으로 넣는 것을 권장합니다.

## 저장 구조

기본 저장 구조는 아래와 같습니다.

```text
<process.cwd()>/<basePath>/<queue-name-lowercase>/
  waiting.json
  meta.json
  queue.lock
  jobs/
    job-1-<jobId>.json
  processing/
  completed/
  failed/
  tmp/
```

- `waiting.json`은 대기 중인 job 파일명 목록입니다.
- `meta.json`은 증가하는 cursor를 저장합니다.
- `jobs/`는 아직 소비되지 않은 job 파일을 둡니다.
- `processing/`, `completed/`, `failed/`는 상태별 보관 위치입니다.
- `tmp/`는 atomic write에 쓰는 임시 파일 위치입니다.

## 동작 요약

1. `add()`가 job JSON 파일을 만들고 `waiting.json`에 파일명을 추가합니다.
2. `consume()`가 다음 job을 꺼내 `processing/`으로 옮기고 job 객체를 반환합니다.
3. `complete()`가 job을 `completed/`로 옮기고 반환 값을 저장합니다.
4. `fail()`이 job을 `failed/`로 옮기거나, 재시도 가능하면 다시 `waiting/`으로 되돌립니다.
5. stale processing job은 다음 `consume()` 시점에 복구됩니다.

## 참고

- queue name은 provider key이기도 하고 디스크 경로에도 사용됩니다.
- `JsonQueueProcessor` 클래스는 provider로 등록되어야 자동으로 발견됩니다.
- lock은 queue 단위로 걸리므로, 같은 큐를 여러 프로세스에서 읽더라도 한 시점에는 하나만 작업합니다.

## 라이선스

MIT
