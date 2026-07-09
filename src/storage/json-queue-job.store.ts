// storage/json-queue-job.store.ts

import { Injectable } from '@nestjs/common';

import { resolve } from 'node:path';

import { JsonQueueFilename } from '../file/json-queue-filename';
import { JsonQueueJob, JsonQueuePaths } from '../types';

import { JsonFileStore } from './json-file.store';

export type JsonQueueJobStoreOptions = {
  paths: JsonQueuePaths;
  fileStore: JsonFileStore;
  filename: JsonQueueFilename;
};

@Injectable()
export class JsonQueueJobStore<T = unknown, R = unknown> {
  constructor(private readonly options: JsonQueueJobStoreOptions) {}

  async read(filePath: string): Promise<JsonQueueJob<T, R>> {
    return this.options.fileStore.readJson<JsonQueueJob<T, R>>(filePath);
  }

  async write(filePath: string, job: JsonQueueJob<T, R>): Promise<void> {
    await this.options.fileStore.writeJson(filePath, job);
  }

  async readFiles(dirPath: string): Promise<string[]> {
    const files = await this.options.fileStore.readDir(dirPath);

    return files.filter((file) => this.options.filename.isJobFilename(file)).sort((a, b) => this.options.filename.compare(a, b));
  }

  existsInWaiting(filename: string): boolean {
    return this.options.fileStore.exists(this.resolveWaitingPath(filename));
  }

  async createWaiting(filename: string, job: JsonQueueJob<T, R>): Promise<void> {
    await this.write(this.resolveWaitingPath(filename), job);
  }

  async moveWaitingToProcessing(filename: string): Promise<string> {
    const from = this.resolveWaitingPath(filename);
    const to = this.resolveProcessingPath(filename);

    await this.options.fileStore.move(from, to);

    return to;
  }

  async moveProcessingToWaiting(filename: string, job: JsonQueueJob<T, R>): Promise<void> {
    const from = this.resolveProcessingPath(filename);
    const to = this.resolveWaitingPath(filename);

    await this.write(from, job);
    await this.options.fileStore.move(from, to);
  }

  async moveProcessingToCompleted(filename: string, job: JsonQueueJob<T, R>): Promise<void> {
    const from = this.resolveProcessingPath(filename);
    const to = this.resolveCompletedPath(filename);

    await this.write(from, job);
    await this.options.fileStore.move(from, to);
  }

  async moveProcessingToFailed(filename: string, job: JsonQueueJob<T, R>): Promise<void> {
    const from = this.resolveProcessingPath(filename);
    const to = this.resolveFailedPath(filename);

    await this.write(from, job);
    await this.options.fileStore.move(from, to);
  }

  async findById(id: string): Promise<JsonQueueJob<T, R> | null> {
    const filePaths = [
      await this.findFilePathById(this.options.paths.jobs, id),
      await this.findFilePathById(this.options.paths.processing, id),
      await this.findFilePathById(this.options.paths.completed, id),
      await this.findFilePathById(this.options.paths.failed, id),
    ];

    for (const filePath of filePaths) {
      if (!filePath || !this.options.fileStore.exists(filePath)) {
        continue;
      }

      return this.read(filePath);
    }

    return null;
  }

  async findFilePathById(dirPath: string, id: string): Promise<string | null> {
    const filename = await this.findFilenameById(dirPath, id);

    if (!filename) {
      return null;
    }

    return resolve(dirPath, filename);
  }

  async findFilenameById(dirPath: string, id: string): Promise<string | null> {
    const files = await this.readFiles(dirPath);

    return (
      files.find((file) => {
        const parsed = this.options.filename.parse(file);

        return parsed?.jobId === id;
      }) ?? null
    );
  }

  async trim(dirPath: string, limit: number): Promise<void> {
    const files = await this.readFiles(dirPath);

    if (limit < 1) {
      await this.options.fileStore.removeMany(files.map((file) => resolve(dirPath, file)));
      return;
    }

    if (files.length <= limit) {
      return;
    }

    const filesToDelete = files.slice(0, files.length - limit);

    await this.options.fileStore.removeMany(filesToDelete.map((file) => resolve(dirPath, file)));
  }

  resolveWaitingPath(filename: string): string {
    return resolve(this.options.paths.jobs, filename);
  }

  resolveProcessingPath(filename: string): string {
    return resolve(this.options.paths.processing, filename);
  }

  resolveCompletedPath(filename: string): string {
    return resolve(this.options.paths.completed, filename);
  }

  resolveFailedPath(filename: string): string {
    return resolve(this.options.paths.failed, filename);
  }
}
