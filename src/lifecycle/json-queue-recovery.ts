// lifecycle/json-queue-recovery.ts

import { Injectable } from '@nestjs/common';

import { JsonQueueJob } from '../types';

import { type JsonQueueRecoveryOptions } from './types';

@Injectable()
export class JsonQueueRecovery<T = unknown, R = unknown> {
  constructor(private readonly options: JsonQueueRecoveryOptions<T, R>) {}

  async recoverStaleProcessingJobs(): Promise<void> {
    const filenames = await this.options.jobStore.readFiles(this.options.paths.processing);
    const waitingList = await this.options.waitingStore.read();
    const now = Date.now();

    for (const filename of filenames) {
      const processingFilePath = this.options.jobStore.resolveProcessingPath(filename);
      const job = await this.options.jobStore.read(processingFilePath);

      if (!this.isProcessingTimeout(job, now)) {
        continue;
      }

      job.updatedAt = new Date().toISOString();

      if (this.canRetry(job)) {
        job.status = 'waiting';

        await this.options.jobStore.moveProcessingToWaiting(filename, job);
        waitingList.unshift(filename);
        continue;
      }

      job.status = 'failed';

      await this.options.jobStore.moveProcessingToFailed(filename, job);
    }

    await this.options.waitingStore.commit(waitingList);
    await this.options.history.trimFailed();
  }

  private canRetry(job: JsonQueueJob<T, R>): boolean {
    return job.attempts < this.options.options.maxAttempts;
  }

  private isProcessingTimeout(job: JsonQueueJob<T, R>, now: number): boolean {
    const updatedAt = new Date(job.updatedAt).getTime();

    if (Number.isNaN(updatedAt)) {
      return false;
    }

    return now - updatedAt >= this.options.options.processingTimeout;
  }
}
