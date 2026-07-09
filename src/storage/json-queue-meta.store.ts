// storage/json-queue-meta.store.ts

import { Injectable } from '@nestjs/common';

import { JsonQueueMeta } from '../types';

import { JsonFileStore } from './json-file.store';

export type JsonQueueMetaStoreOptions = {
  metaPath: string;
  fileStore: JsonFileStore;
};

@Injectable()
export class JsonQueueMetaStore {
  constructor(private readonly options: JsonQueueMetaStoreOptions) {}

  async nextCursor(): Promise<number> {
    const meta = await this.read();
    const cursor = meta.cursor + 1;

    await this.write({ cursor });

    return cursor;
  }

  async read(): Promise<JsonQueueMeta> {
    const meta = await this.options.fileStore.readJsonOrNull<Partial<JsonQueueMeta>>(this.options.metaPath);

    if (!meta) {
      return this.createDefault();
    }

    return {
      cursor: this.normalizeCursor(meta.cursor),
    };
  }

  async write(meta: JsonQueueMeta): Promise<void> {
    await this.options.fileStore.writeJson(this.options.metaPath, {
      cursor: this.normalizeCursor(meta.cursor),
    });
  }

  async ensure(): Promise<void> {
    if (this.options.fileStore.exists(this.options.metaPath)) {
      return;
    }

    await this.write(this.createDefault());
  }

  private createDefault(): JsonQueueMeta {
    return {
      cursor: 0,
    };
  }

  private normalizeCursor(cursor: unknown): number {
    if (typeof cursor !== 'number') {
      return 0;
    }

    if (!Number.isSafeInteger(cursor) || cursor < 0) {
      return 0;
    }

    return cursor;
  }
}
