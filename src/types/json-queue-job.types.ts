export type JsonQueueJobStatus = 'waiting' | 'processing' | 'completed' | 'failed';

export type JsonQueueError = {
  name?: string;
  message: string;
  stack?: string;
  cause?: unknown;
};

export type JsonQueueJob<T = unknown, R = unknown> = {
  id: string;
  data: T;
  status: JsonQueueJobStatus;
  attempts: number;
  error?: JsonQueueError;
  createdAt: string;
  updatedAt: string;
  returnValue: R;
};
