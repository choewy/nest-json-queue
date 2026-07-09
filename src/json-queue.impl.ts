// json-queue.impl.ts

import { Injectable } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { JsonQueueOptionResolver } from './config/json-queue-option.resolver';
import { JsonQueueResolvedOptions } from './config/types';
import { JsonQueueFilename } from './file/json-queue-filename';
import { JsonQueue } from './json-queue';
import { JsonQueueHistory } from './lifecycle/json-queue-history';
import { JsonQueueInitializer } from './lifecycle/json-queue-initializer';
import { JsonQueueRecovery } from './lifecycle/json-queue-recovery';
import { JsonQueueLock } from './lock/json-queue-lock';
import { JsonFileStore } from './storage/json-file.store';
import { JsonQueueJobStore } from './storage/json-queue-job.store';
import { JsonQueueMetaStore } from './storage/json-queue-meta.store';
import { JsonQueueWaitingStore } from './storage/json-queue-waiting.store';
import { JsonQueueJob, type JsonQueueOptions, JsonQueuePaths } from './types';

@Injectable()
export class JsonQueueImpl<T = unknown, R = unknown> implements JsonQueue<T, R> {
  private readonly name: string;
  private readonly options: JsonQueueResolvedOptions;
  private readonly paths: JsonQueuePaths;

  private readonly filename: JsonQueueFilename;
  private readonly lock: JsonQueueLock;
  private readonly fileStore: JsonFileStore;
  private readonly jobStore: JsonQueueJobStore<T, R>;
  private readonly metaStore: JsonQueueMetaStore;
  private readonly waitingStore: JsonQueueWaitingStore;
  private readonly initializer: JsonQueueInitializer;
  private readonly history: JsonQueueHistory;
  private readonly recovery: JsonQueueRecovery<T, R>;

  // TODO refactor DI
  constructor(name: string, options: JsonQueueOptions) {
    const resolved = new JsonQueueOptionResolver().resolve(name, options);

    this.name = name;
    this.options = resolved.options;
    this.paths = resolved.paths;

    this.filename = new JsonQueueFilename();

    this.fileStore = new JsonFileStore({
      tmpPath: this.paths.tmp,
    });

    this.jobStore = new JsonQueueJobStore<T, R>({
      paths: this.paths,
      fileStore: this.fileStore,
      filename: this.filename,
    });

    this.metaStore = new JsonQueueMetaStore({
      metaPath: this.paths.meta,
      fileStore: this.fileStore,
    });

    this.waitingStore = new JsonQueueWaitingStore({
      waitingPath: this.paths.waiting,
      fileStore: this.fileStore,
    });

    this.initializer = new JsonQueueInitializer({
      options: this.options,
      paths: this.paths,
      fileStore: this.fileStore,
      metaStore: this.metaStore,
      waitingStore: this.waitingStore,
    });

    this.history = new JsonQueueHistory({
      options: this.options,
      paths: this.paths,
      jobStore: this.jobStore,
    });

    this.recovery = new JsonQueueRecovery<T, R>({
      options: this.options,
      paths: this.paths,
      jobStore: this.jobStore,
      waitingStore: this.waitingStore,
      history: this.history,
    });

    this.lock = new JsonQueueLock({
      name: this.name,
      basePath: this.options.basePath,
      lockPath: this.paths.lock,
      lockTimeout: this.options.lockTimeout,
      lockRetryDelay: this.options.lockRetryDelay,
    });
  }

  async add(data: T, jobId?: string): Promise<string> {
    return this.lock.run(async () => {
      await this.initializer.ensure();

      const id = jobId ?? randomUUID();
      const existingJob = await this.jobStore.findById(id);

      if (existingJob) {
        return existingJob.id;
      }

      const cursor = await this.metaStore.nextCursor();
      const filename = this.filename.create(cursor, id);
      const job = this.createWaitingJob(id, data);

      await this.jobStore.createWaiting(filename, job);
      await this.waitingStore.push(filename);

      return id;
    });
  }

  async consume(): Promise<JsonQueueJob<T, R> | null> {
    return this.lock.run(async () => {
      await this.initializer.ensure();
      await this.recovery.recoverStaleProcessingJobs();

      while (true) {
        const { filename, waitingList } = await this.waitingStore.shift();

        if (!filename) {
          await this.waitingStore.commit(waitingList);
          return null;
        }

        if (!this.jobStore.existsInWaiting(filename)) {
          await this.waitingStore.commit(waitingList);
          continue;
        }

        const processingFilePath = await this.jobStore.moveWaitingToProcessing(filename);
        const job = await this.jobStore.read(processingFilePath);

        this.markProcessing(job);

        await this.jobStore.write(processingFilePath, job);
        await this.waitingStore.commit(waitingList);

        return job;
      }
    });
  }

  async complete(id: string, returnValue: R): Promise<void> {
    await this.lock.run(async () => {
      await this.initializer.ensure();

      const filename = await this.jobStore.findFilenameById(this.paths.processing, id);

      if (!filename) {
        return;
      }

      const processingFilePath = this.jobStore.resolveProcessingPath(filename);
      const job = await this.jobStore.read(processingFilePath);

      this.markCompleted(job, returnValue);

      await this.jobStore.moveProcessingToCompleted(filename, job);
      await this.history.trimCompleted();
    });
  }

  async fail(id: string, error: unknown): Promise<void> {
    await this.lock.run(async () => {
      await this.initializer.ensure();

      const filename = await this.jobStore.findFilenameById(this.paths.processing, id);

      if (!filename) {
        return;
      }

      const processingFilePath = this.jobStore.resolveProcessingPath(filename);
      const job = await this.jobStore.read(processingFilePath);

      this.markError(job, error);

      if (this.canRetry(job)) {
        await this.retryJob(filename, job);
        return;
      }

      await this.failJob(filename, job);
      await this.history.trimFailed();
    });
  }

  private createWaitingJob(id: string, data: T): JsonQueueJob<T, R> {
    const now = new Date().toISOString();

    return {
      id,
      data,
      attempts: 0,
      status: 'waiting',
      createdAt: now,
      updatedAt: now,
      returnValue: null as R,
    };
  }

  private markProcessing(job: JsonQueueJob<T, R>): void {
    job.status = 'processing';
    job.attempts += 1;
    job.updatedAt = new Date().toISOString();
  }

  private markCompleted(job: JsonQueueJob<T, R>, returnValue: R): void {
    job.status = 'completed';
    job.updatedAt = new Date().toISOString();
    job.returnValue = returnValue;
  }

  private markError(job: JsonQueueJob<T, R>, error: unknown): void {
    job.updatedAt = new Date().toISOString();
    job.error =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause,
          }
        : { message: String(error) };
  }

  private canRetry(job: JsonQueueJob<T, R>): boolean {
    return job.attempts < this.options.maxAttempts;
  }

  private async retryJob(filename: string, job: JsonQueueJob<T, R>): Promise<void> {
    job.status = 'waiting';

    await this.jobStore.moveProcessingToWaiting(filename, job);
    await this.waitingStore.unshift(filename);
  }

  private async failJob(filename: string, job: JsonQueueJob<T, R>): Promise<void> {
    job.status = 'failed';

    await this.jobStore.moveProcessingToFailed(filename, job);
  }
}
