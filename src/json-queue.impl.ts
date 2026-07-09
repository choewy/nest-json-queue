import { Injectable } from '@nestjs/common';
import { JsonQueue } from './json-queue';
import { JsonQueueJob, type JsonQueueOptions } from './types';

@Injectable()
export class JsonQueueImpl implements JsonQueue {
  constructor(name: string, options: JsonQueueOptions) {}

  add(data: unknown, jobId?: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  consume(): Promise<JsonQueueJob<unknown, unknown> | null> {
    throw new Error('Method not implemented.');
  }

  complete(jobId: string, returnValue: unknown): Promise<void> {
    throw new Error('Method not implemented.');
  }

  fail(jobId: string, error: unknown): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
