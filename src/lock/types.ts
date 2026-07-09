export type JsonQueueLockOptions = {
  name: string;
  basePath: string;
  lockPath: string;
  lockTimeout: number;
  lockRetryDelay: number;
};

export type JsonQueueLockFile = {
  pid: number;
  queue: string;
  createdAt: string;
};
