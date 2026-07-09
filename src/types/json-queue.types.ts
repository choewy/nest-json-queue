import { JsonQueueResolvedOptions } from '../config/types';
import { JsonQueueFilename } from '../file/json-queue-filename';
import { JsonQueueHistory } from '../lifecycle/json-queue-history';
import { JsonQueueInitializer } from '../lifecycle/json-queue-initializer';
import { JsonQueueRecovery } from '../lifecycle/json-queue-recovery';
import { JsonQueueLock } from '../lock/json-queue-lock';
import { JsonQueueJobStore } from '../storage/json-queue-job.store';
import { JsonQueueMetaStore } from '../storage/json-queue-meta.store';
import { JsonQueueWaitingStore } from '../storage/json-queue-waiting.store';

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

export type JsonQueueProps<T = unknown, R = unknown> = {
  name: string;
  options: JsonQueueResolvedOptions;
  paths: JsonQueuePaths;
  filename: JsonQueueFilename;
  lock: JsonQueueLock;
  jobStore: JsonQueueJobStore<T, R>;
  metaStore: JsonQueueMetaStore;
  waitingStore: JsonQueueWaitingStore;
  initializer: JsonQueueInitializer;
  history: JsonQueueHistory;
  recovery: JsonQueueRecovery<T, R>;
};
