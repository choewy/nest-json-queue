# nest-json-queue

[![npm version](https://img.shields.io/npm/v/nest-json-queue.svg)](https://www.npmjs.com/package/nest-json-queue)
[![npm downloads](https://img.shields.io/npm/dm/nest-json-queue.svg)](https://www.npmjs.com/package/nest-json-queue)
[![license](https://img.shields.io/npm/l/nest-json-queue.svg)](./LICENSE.md)

`nest-json-queue` is a persistent JSON file-based queue for NestJS.

Jobs are stored on disk, and consumption is serialized using a file lock. This allows you to build a simple job queue without Redis or an external message broker.

It works best in environments where all processes share the same filesystem. When using containers, it is recommended to store the queue directory on a persistent volume.

## Features

- Register multiple queues at once.
- Separate producers and consumers.
- Prevent duplicate jobs by providing a custom `jobId`.
- Automatically retry failed jobs within the configured `maxAttempts`.
- Recover jobs that remain in the processing state longer than `processingTimeout`.
- Limit and clean up completed and failed job history.
- Use either the built-in consumer loop or manual `consume()` handling.

## Installation

```bash
npm install nest-json-queue
```

```bash
pnpm add nest-json-queue
```

## Quick Start

### 1. Register the Module

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

`forRoot()` and `forRootAsync()` register queues globally.

`register()` and `registerAsync()` register queues locally, so they must be imported directly into every module that uses the queue.

### 2. Add Jobs from a Producer

```ts
import { Injectable } from '@nestjs/common';
import { InjectJsonQueue, JsonQueue } from 'nest-json-queue';

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

`add(data, jobId?)` returns the ID of the enqueued job.

When a job with the same `jobId` already exists, the existing job ID is returned and no duplicate job is created.

### 3. Process Jobs from a Consumer

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

`@JsonQueueProcessor()` also applies `@Injectable()` to the class, so you do not need to add `@Injectable()` separately.

The `process(job)` method is required.

The `complete(job, returnValue)` and `failed(job, error)` hooks are optional.

When `process()` throws an error, the runner automatically calls `fail()` and then invokes the `failed()` hook.

### 4. Run the Consumer as a Separate Worker Application

The producer and consumer can run in the same NestJS application, or they can be separated into different application contexts, such as `apps/producer` and `apps/consumer`.

When running them separately, both applications must use the same `basePath`.

## Async Configuration

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

`useFactory()` must return a queue options object.

Providers used by the factory must be included in `inject` and must be available within the current module scope.

## Queue API

`JsonQueue<T, R>` provides the following methods.

| Method                         | Description                                                              |
| ------------------------------ | ------------------------------------------------------------------------ |
| `add(data, jobId?)`            | Adds a job to the queue and returns its job ID.                          |
| `consume()`                    | Retrieves the next job. Returns `null` when the queue is empty.          |
| `complete(jobId, returnValue)` | Marks a job as completed and stores its return value.                    |
| `fail(jobId, error)`           | Marks a job as failed or returns it to the waiting queue when retryable. |

You can also process jobs manually.

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

## Options

Queue options are configured through the `options` object passed to `JsonQueueModule`.

| Option              | Default     | Description                                                                                                   |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `basePath`          | `jsonqueue` | Parent directory used for queue storage. The final path is `process.cwd()/<basePath>/<queue-name-lowercase>`. |
| `maxAttempts`       | `1`         | Total number of processing attempts. A value of `1` disables retries.                                         |
| `processingTimeout` | `60_000`    | Time in milliseconds before a job in the processing state is considered stale.                                |
| `lockTimeout`       | `10_000`    | Time in milliseconds before a lock file is considered stale.                                                  |
| `lockRetryDelay`    | `50`        | Delay in milliseconds before retrying after failing to acquire the lock.                                      |
| `completedLimit`    | `1000`      | Maximum number of completed job files to retain.                                                              |
| `failedLimit`       | `1000`      | Maximum number of failed job files to retain.                                                                 |

### Important Notes

- `maxAttempts` is the total number of attempts, not the number of retries.
- Stale processing jobs are recovered during the next `consume()` call.
- When `completedLimit` or `failedLimit` is `0` or lower, all history for that state is deleted.
- Queue names are converted to lowercase when used as directory names. Avoid queue names that differ only by letter casing.
- A `jobId` is used as part of a filename, so a filesystem-safe value is recommended.

## Storage Structure

The default storage structure is as follows.

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

- `waiting.json` stores the filenames of jobs waiting to be processed.
- `meta.json` stores the incrementing cursor value.
- `jobs/` contains jobs that have not yet been consumed.
- `processing/`, `completed/`, and `failed/` contain jobs grouped by their current state.
- `tmp/` contains temporary files used for atomic writes.

## How It Works

1. `add()` creates a JSON job file and adds its filename to `waiting.json`.
2. `consume()` retrieves the next job, moves it to `processing/`, and returns the job object.
3. `complete()` moves the job to `completed/` and stores its return value.
4. `fail()` moves the job to `failed/`, or returns it to the waiting queue when another attempt is allowed.
5. Stale processing jobs are recovered during the next `consume()` call.

## Notes

- The queue name is used both as a NestJS provider key and as part of the on-disk path.
- A class decorated with `@JsonQueueProcessor()` must be registered as a provider so it can be discovered automatically.
- Locks are applied per queue. Even when multiple processes consume the same queue, only one process can retrieve a job at a time.

## License

MIT
