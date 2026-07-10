import { JsonQueueProcessor } from '@libs';
import { JsonQueueProcessorInstance } from '@libs/types';

import { ConsumerService } from './consumer.service';
import { TestJob, TestJobData, TestJobReturnValue } from './types';

@JsonQueueProcessor('test')
export class ConsumerProcessor implements JsonQueueProcessorInstance<TestJobData, TestJobReturnValue> {
  constructor(private readonly consumerService: ConsumerService) {}

  process(job: TestJob): TestJobReturnValue {
    return this.consumerService.handleProcess(job.data);
  }

  complete(job: TestJob, returnValue: TestJobReturnValue): Promise<void> | void {
    console.log({ job, returnValue });
  }

  failed(job: TestJob, error: unknown): Promise<void> | void {
    console.log({ job, error });
  }
}
