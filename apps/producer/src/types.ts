import { JsonQueueJob } from '@libs/types';

export type TestJobData = {
  id: number;
  createdBy: string;
  createdAt: Date;
};

export type TestJobReturnValue = {
  ok: boolean;
};

export type TestJob = JsonQueueJob<TestJobData, TestJobReturnValue>;
