import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { DiscoveryService, ModuleRef, Reflector } from '@nestjs/core';

import { JSON_QUEUE_PROCESSOR } from './constants';
import { getJsonQueueToken } from './helpers';
import { JsonQueue } from './json-queue';
import { JsonQueueProcessorContext, JsonQueueProcessorInstance } from './types';

@Injectable()
export class JsonQueueRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(JsonQueueRunner.name);
  private readonly processors: JsonQueueProcessorContext[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  onApplicationShutdown() {
    for (const consumer of this.processors) {
      consumer.running = false;
    }
  }

  onApplicationBootstrap() {
    const wrappers = this.discoveryService.getProviders();

    for (const wrapper of wrappers) {
      const instance = wrapper.instance as JsonQueueProcessorInstance;

      if (!instance) {
        continue;
      }

      const name = this.reflector.get<string>(JSON_QUEUE_PROCESSOR, instance.constructor);

      if (!name) {
        continue;
      }

      if (typeof instance.process !== 'function') {
        throw new Error(`@JsonQueueProcessor('${name}') requires process(job) method.`);
      }

      const queue = this.moduleRef.get<JsonQueue>(getJsonQueueToken(name), { strict: false });
      const processor: JsonQueueProcessorContext = {
        name,
        queue,
        instance,
        running: true,
        processing: false,
      };

      this.processors.push(processor);

      void this.loop(processor);
    }
  }

  private async loop(processor: JsonQueueProcessorContext): Promise<void> {
    while (processor.running) {
      if (processor.processing) {
        await this.sleep(100);
        continue;
      }

      const job = await processor.queue.consume();

      if (!job) {
        await this.sleep(500);
        continue;
      }

      processor.processing = true;

      try {
        const returnValue = await processor.instance.process(job);

        await processor.queue.complete(job.id, returnValue);

        if (typeof processor.instance.complete === 'function') {
          await processor.instance.complete(job, returnValue);
        }
      } catch (error) {
        await processor.queue.fail(job.id, error);

        if (typeof processor.instance.failed === 'function') {
          await processor.instance.failed(job, error);
        }

        this.logger.error(`JsonQueue job failed. queue=${processor.name}, jobId=${job.id}`, error instanceof Error ? error.stack : String(error));
      } finally {
        processor.processing = false;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
