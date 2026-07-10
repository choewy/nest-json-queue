import { Injectable } from '@nestjs/common';

import { type JsonQueueHistoryOptions } from './types';

@Injectable()
export class JsonQueueHistory {
  constructor(private readonly options: JsonQueueHistoryOptions) {}

  async trimCompleted(): Promise<void> {
    await this.options.jobStore.trim(this.options.paths.completed, this.options.options.completedLimit);
  }

  async trimFailed(): Promise<void> {
    await this.options.jobStore.trim(this.options.paths.failed, this.options.options.failedLimit);
  }
}
