export type JsonQueuePaths = {
  waiting: string;
  meta: string;
  lock: string;
  jobs: string;
  processing: string;
  completed: string;
  failed: string;
  tmp: string;
};

export type JsonQueueMeta = {
  cursor: number;
};

export type JsonQueueParsedJobFilename = {
  cursor: number;
  jobId: string;
};

export type JsonQueueWaitingList = string[];
