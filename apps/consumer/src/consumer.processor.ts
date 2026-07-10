import { JsonQueueProcessor } from '@libs';
import { JsonQueueJob, JsonQueueProcessorInstance } from '@libs/types';

import { ConsumerService } from './consumer.service';

@JsonQueueProcessor('test')
export class ConsumerProcessor implements JsonQueueProcessorInstance {
  constructor(private readonly consumerService: ConsumerService) {}

  process(job: JsonQueueJob<unknown, unknown>) {
    console.log({ job });
  }

  complete(job: JsonQueueJob<unknown, unknown>, returnValue: unknown): Promise<void> | void {
    console.log({ job, returnValue });
  }

  failed(job: JsonQueueJob<unknown, unknown>, error: unknown): Promise<void> | void {
    console.log({ job, error });
  }
}
