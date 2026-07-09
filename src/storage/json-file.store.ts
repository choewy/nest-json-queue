// storage/json-file.store.ts

import { Injectable } from '@nestjs/common';

import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

import { JsonQueueError } from '../errors';

export type JsonFileStoreOptions = {
  tmpPath: string;
};

@Injectable()
export class JsonFileStore {
  constructor(private readonly options: JsonFileStoreOptions) {}

  exists(filePath: string): boolean {
    return existsSync(filePath);
  }

  async ensureDir(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true });
  }

  async readDir(dirPath: string): Promise<string[]> {
    if (!this.exists(dirPath)) {
      return [];
    }

    return readdir(dirPath);
  }

  async readText(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      throw JsonQueueError.fileReadFailed(filePath, error);
    }
  }

  async readJson<T>(filePath: string): Promise<T> {
    try {
      const raw = await this.readText(filePath);

      return JSON.parse(raw) as T;
    } catch (error) {
      if (error instanceof JsonQueueError) {
        throw error;
      }

      throw JsonQueueError.fileReadFailed(filePath, error);
    }
  }

  async readJsonOrNull<T>(filePath: string): Promise<T | null> {
    if (!this.exists(filePath)) {
      return null;
    }

    const raw = await this.readText(filePath);

    if (!raw.trim()) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async writeJson(filePath: string, value: unknown): Promise<void> {
    await this.writeAtomic(filePath, JSON.stringify(value, null, 2));
  }

  async writeText(filePath: string, value: string): Promise<void> {
    await this.writeAtomic(filePath, value);
  }

  async move(from: string, to: string): Promise<void> {
    try {
      await this.ensureDir(dirname(to));
      await rename(from, to);
    } catch (error) {
      throw JsonQueueError.fileMoveFailed(from, to, error);
    }
  }

  async remove(filePath: string): Promise<void> {
    await rm(filePath, { force: true });
  }

  async removeMany(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map((filePath) => this.remove(filePath)));
  }

  private async writeAtomic(filePath: string, value: string): Promise<void> {
    const tmpFilePath = this.createTmpFilePath(filePath);

    try {
      await this.ensureDir(dirname(filePath));
      await this.ensureDir(this.options.tmpPath);

      await writeFile(tmpFilePath, value, 'utf-8');
      await rename(tmpFilePath, filePath);
    } catch (error) {
      await rm(tmpFilePath, { force: true }).catch(() => undefined);

      throw JsonQueueError.fileWriteFailed(filePath, error);
    }
  }

  private createTmpFilePath(filePath: string): string {
    const filename = basename(filePath);

    return resolve(this.options.tmpPath, `${filename}.${process.pid}.${randomUUID()}.tmp`);
  }
}
