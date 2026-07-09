import { JsonQueueResolvedOptions } from '../config/types';
import { JsonFileStore } from '../storage/json-file.store';
import { JsonQueueJobStore } from '../storage/json-queue-job.store';
import { JsonQueueMetaStore } from '../storage/json-queue-meta.store';
import { JsonQueueWaitingStore } from '../storage/json-queue-waiting.store';
import { JsonQueuePaths } from '../types';

import { JsonQueueHistory } from './json-queue-history';

export type JsonQueueInitializerOptions = {
  options: JsonQueueResolvedOptions;
  paths: JsonQueuePaths;
  fileStore: JsonFileStore;
  metaStore: JsonQueueMetaStore;
  waitingStore: JsonQueueWaitingStore;
};

export type JsonQueueHistoryOptions = {
  options: JsonQueueResolvedOptions;
  paths: JsonQueuePaths;
  jobStore: JsonQueueJobStore;
};

export type JsonQueueRecoveryOptions<T = unknown, R = unknown> = {
  options: JsonQueueResolvedOptions;
  paths: JsonQueuePaths;
  jobStore: JsonQueueJobStore<T, R>;
  waitingStore: JsonQueueWaitingStore;
  history: JsonQueueHistory;
};
