// lifecycle/json-queue-initializer.ts

import { Injectable } from '@nestjs/common';

import { type JsonQueueInitializerOptions } from './types';

@Injectable()
export class JsonQueueInitializer {
  constructor(private readonly options: JsonQueueInitializerOptions) {}

  async ensure(): Promise<void> {
    await this.ensureDirectories();
    await this.ensureFiles();
  }

  private async ensureDirectories(): Promise<void> {
    await Promise.all([
      this.options.fileStore.ensureDir(this.options.options.basePath),
      this.options.fileStore.ensureDir(this.options.paths.jobs),
      this.options.fileStore.ensureDir(this.options.paths.processing),
      this.options.fileStore.ensureDir(this.options.paths.completed),
      this.options.fileStore.ensureDir(this.options.paths.failed),
      this.options.fileStore.ensureDir(this.options.paths.tmp),
    ]);
  }

  private async ensureFiles(): Promise<void> {
    await Promise.all([this.options.waitingStore.ensure(), this.options.metaStore.ensure()]);
  }
}
