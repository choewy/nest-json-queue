import { JsonQueue } from '@libs/json-queue';

import { JsonQueueJob } from './json-queue-job.types';

export type JsonQueueProcessorInstance<T = unknown, R = unknown> = {
  process(job: JsonQueueJob<T, R>): Promise<R> | R;
  complete?(job: JsonQueueJob<T, R>, returnValue: R): Promise<void> | void;
  failed?(job: JsonQueueJob<T, R>, error: unknown): Promise<void> | void;
};

export type JsonQueueProcessorContext = {
  name: string;
  queue: JsonQueue;
  instance: JsonQueueProcessorInstance;
  running: boolean;
  processing: boolean;
};
