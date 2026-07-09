import { Injectable, Module, ModuleMetadata, Optional } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { InjectJsonQueue, JsonQueue, JsonQueueModule } from '@libs';
import { getJsonQueueToken } from '@libs/helpers';
import { JsonQueueImpl } from '@libs/json-queue.impl';

const TestQueueName = 'TestQueue';

@Injectable()
class TestQueueService {
  constructor(
    @Optional()
    @InjectJsonQueue(TestQueueName)
    readonly queue?: JsonQueue,
  ) {}
}

@Module({
  providers: [TestQueueService],
})
class TestQueueModule {}

function createRefModule(metadata: ModuleMetadata) {
  @Module(metadata)
  class TestQueueModule {}
  return TestQueueModule;
}

describe('JsonQueueModule', () => {
  it('forRoot은 global module로 동작하여 다른 module에서 import 없이 queue를 주입받을 수 있다.', async () => {
    // given
    const testingModule = await Test.createTestingModule({
      imports: [
        TestQueueModule,
        createRefModule({
          imports: [JsonQueueModule.forRoot([{ name: TestQueueName, options: {} }])],
        }),
      ],
    }).compile();

    // when
    const testQueue = testingModule.get(getJsonQueueToken(TestQueueName));
    const testQueueService = testingModule.get(TestQueueService);

    // then
    expect(testQueue).toBeDefined();
    expect(testQueue).toBeInstanceOf(JsonQueueImpl);
    expect(testQueueService).toBeDefined();
    expect(testQueueService).toBeInstanceOf(TestQueueService);
    expect(testQueueService.queue).toBeDefined();
    expect(testQueueService.queue).toBeInstanceOf(JsonQueueImpl);
  });

  it('forRootAsync은 global module로 동작하여 다른 module에서 import 없이 queue를 주입받을 수 있다.', async () => {
    // given
    const testingModule = await Test.createTestingModule({
      imports: [
        TestQueueModule,
        createRefModule({
          imports: [
            JsonQueueModule.forRootAsync([
              {
                name: TestQueueName,
                inject: [],
                useFactory: () => ({}),
              },
            ]),
          ],
        }),
      ],
    }).compile();

    // when
    const testQueue = testingModule.get(getJsonQueueToken(TestQueueName));
    const testQueueService = testingModule.get(TestQueueService);

    // then
    expect(testQueue).toBeDefined();
    expect(testQueue).toBeInstanceOf(JsonQueueImpl);
    expect(testQueueService).toBeDefined();
    expect(testQueueService).toBeInstanceOf(TestQueueService);
    expect(testQueueService.queue).toBeDefined();
    expect(testQueueService.queue).toBeInstanceOf(JsonQueueImpl);
  });

  it('register는 global module이 아니므로 다른 module에서 import 없이 queue를 주입받을 수 없다.', async () => {
    // given
    const testingModule = await Test.createTestingModule({
      imports: [
        TestQueueModule,
        createRefModule({
          imports: [JsonQueueModule.register([{ name: TestQueueName, options: {} }])],
        }),
      ],
    }).compile();

    // when
    const testQueue = testingModule.get(getJsonQueueToken(TestQueueName));
    const testQueueService = testingModule.get(TestQueueService);

    // then
    expect(testQueue).toBeDefined();
    expect(testQueueService).toBeInstanceOf(TestQueueService);
    expect(testQueueService.queue).toBeUndefined();
  });

  it('registerAsync는 global module이 아니므로 다른 module에서 import 없이 queue를 주입받을 수 없다.', async () => {
    // given
    const testingModule = await Test.createTestingModule({
      imports: [
        TestQueueModule,
        createRefModule({
          imports: [
            JsonQueueModule.registerAsync([
              {
                name: TestQueueName,
                inject: [],
                useFactory: () => ({}),
              },
            ]),
          ],
        }),
      ],
    }).compile();

    // when
    const testQueue = testingModule.get(getJsonQueueToken(TestQueueName));
    const testQueueService = testingModule.get(TestQueueService);

    // then
    expect(testQueue).toBeDefined();
    expect(testQueueService).toBeInstanceOf(TestQueueService);
    expect(testQueueService.queue).toBeUndefined();
  });
});
