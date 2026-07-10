import { Injectable } from '@nestjs/common';

import { JsonQueueOptionResolver } from './config/json-queue-option.resolver';
import { JsonQueueFilename } from './file/json-queue-filename';
import { JsonQueueImpl } from './json-queue.impl';
import { JsonQueueHistory } from './lifecycle/json-queue-history';
import { JsonQueueInitializer } from './lifecycle/json-queue-initializer';
import { JsonQueueRecovery } from './lifecycle/json-queue-recovery';
import { JsonQueueLock } from './lock/json-queue-lock';
import { JsonFileStore } from './storage/json-file.store';
import { JsonQueueJobStore } from './storage/json-queue-job.store';
import { JsonQueueMetaStore } from './storage/json-queue-meta.store';
import { JsonQueueWaitingStore } from './storage/json-queue-waiting.store';
import { JsonQueueOptions } from './types';

@Injectable()
export class JsonQueueFactory {
  create<T = unknown, R = unknown>(name: string, options: JsonQueueOptions): JsonQueueImpl<T, R> {
    const resolved = new JsonQueueOptionResolver().resolve(name, options);
    const filename = new JsonQueueFilename();

    const fileStore = new JsonFileStore({ tmpPath: resolved.paths.tmp });
    const jobStore = new JsonQueueJobStore<T, R>({
      paths: resolved.paths,
      fileStore,
      filename,
    });

    const metaStore = new JsonQueueMetaStore({
      metaPath: resolved.paths.meta,
      fileStore,
    });

    const waitingStore = new JsonQueueWaitingStore({
      waitingPath: resolved.paths.waiting,
      fileStore,
    });

    const initializer = new JsonQueueInitializer({
      options: resolved.options,
      paths: resolved.paths,
      fileStore,
      metaStore,
      waitingStore,
    });

    const history = new JsonQueueHistory({
      options: resolved.options,
      paths: resolved.paths,
      jobStore,
    });

    const recovery = new JsonQueueRecovery<T, R>({
      options: resolved.options,
      paths: resolved.paths,
      jobStore,
      waitingStore,
      history,
    });

    const lock = new JsonQueueLock({
      name,
      basePath: resolved.options.basePath,
      lockPath: resolved.paths.lock,
      lockTimeout: resolved.options.lockTimeout,
      lockRetryDelay: resolved.options.lockRetryDelay,
    });

    return new JsonQueueImpl<T, R>({ name, options: resolved.options, paths: resolved.paths, filename, lock, jobStore, metaStore, waitingStore, initializer, history, recovery });
  }
}
