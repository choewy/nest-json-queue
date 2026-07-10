import { Injectable } from '@nestjs/common';

import { JsonQueueWaitingList } from '../types';

import { JsonFileStore } from './json-file.store';

export type JsonQueueWaitingStoreOptions = {
  waitingPath: string;
  fileStore: JsonFileStore;
};

@Injectable()
export class JsonQueueWaitingStore {
  constructor(private readonly options: JsonQueueWaitingStoreOptions) {}

  async ensure(): Promise<void> {
    if (this.options.fileStore.exists(this.options.waitingPath)) {
      return;
    }

    await this.write([]);
  }

  async read(): Promise<JsonQueueWaitingList> {
    const waitingList = await this.options.fileStore.readJsonOrNull<unknown>(this.options.waitingPath);

    if (!Array.isArray(waitingList)) {
      return [];
    }

    return waitingList.filter((item): item is string => typeof item === 'string');
  }

  async write(waitingList: JsonQueueWaitingList): Promise<void> {
    await this.options.fileStore.writeJson(this.options.waitingPath, this.unique(waitingList));
  }

  async push(filename: string): Promise<void> {
    const waitingList = await this.read();

    waitingList.push(filename);

    await this.write(waitingList);
  }

  async unshift(filename: string): Promise<void> {
    const waitingList = await this.read();

    waitingList.unshift(filename);

    await this.write(waitingList);
  }

  async shift(): Promise<{
    filename: string | null;
    waitingList: JsonQueueWaitingList;
  }> {
    const waitingList = await this.read();
    const filename = waitingList.shift() ?? null;

    return {
      filename,
      waitingList,
    };
  }

  async commit(waitingList: JsonQueueWaitingList): Promise<void> {
    await this.write(waitingList);
  }

  private unique(waitingList: JsonQueueWaitingList): JsonQueueWaitingList {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const filename of waitingList) {
      if (seen.has(filename)) {
        continue;
      }

      seen.add(filename);
      result.push(filename);
    }

    return result;
  }
}
