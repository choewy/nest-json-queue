// lock/json-queue-lock.ts

import { Injectable } from '@nestjs/common';

import { existsSync } from 'node:fs';
import { mkdir, open, readFile, rm } from 'node:fs/promises';

import { JsonQueueError } from '../errors';

import { JsonQueueLockFile, type JsonQueueLockOptions } from './types';

@Injectable()
export class JsonQueueLock {
  constructor(private readonly options: JsonQueueLockOptions) {}

  async run<T>(callback: () => Promise<T>): Promise<T> {
    const release = await this.acquire();

    try {
      return await callback();
    } finally {
      await release();
    }
  }

  async acquire(): Promise<() => Promise<void>> {
    await mkdir(this.options.basePath, { recursive: true });

    const startedAt = Date.now();

    while (true) {
      try {
        await this.createLockFile();

        return async () => {
          await this.release();
        };
      } catch (error) {
        if (!JsonQueueError.isFileExistsError(error)) {
          throw error;
        }

        await this.handleLocked(startedAt);
      }
    }
  }

  async release(): Promise<void> {
    await rm(this.options.lockPath, { force: true });
  }

  async removeStale(): Promise<void> {
    if (!existsSync(this.options.lockPath)) {
      return;
    }

    const parsed = await this.parse();

    if (!parsed) {
      await this.release();
      return;
    }

    const createdAt = new Date(parsed.createdAt ?? '').getTime();

    if (!createdAt || Number.isNaN(createdAt)) {
      await this.release();
      return;
    }

    if (Date.now() - createdAt >= this.options.lockTimeout) {
      await this.release();
    }
  }

  private async createLockFile(): Promise<void> {
    const handle = await open(this.options.lockPath, 'wx');

    try {
      const lockFile: JsonQueueLockFile = {
        pid: process.pid,
        queue: this.options.name,
        createdAt: new Date().toISOString(),
      };

      await handle.writeFile(JSON.stringify(lockFile, null, 2), 'utf-8');
    } finally {
      await handle.close();
    }
  }

  private async handleLocked(startedAt: number): Promise<void> {
    const elapsed = Date.now() - startedAt;

    if (elapsed >= this.options.lockTimeout) {
      await this.removeStale();

      if (Date.now() - startedAt >= this.options.lockTimeout * 2) {
        throw JsonQueueError.lockTimeout(this.options.name);
      }
    }

    await this.waitFor(this.options.lockRetryDelay);
  }

  private async parse(): Promise<Partial<JsonQueueLockFile> | null> {
    const raw = await readFile(this.options.lockPath, 'utf-8').catch(() => null);

    if (!raw?.trim()) {
      return null;
    }

    try {
      return JSON.parse(raw) as Partial<JsonQueueLockFile>;
    } catch {
      return null;
    }
  }

  private waitFor(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
