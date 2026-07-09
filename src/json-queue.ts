import { JsonQueueJob } from './types';

export abstract class JsonQueue<T = unknown, R = unknown> {
  abstract add(data: T, jobId?: string): Promise<string>;
  abstract consume(): Promise<JsonQueueJob<T, R> | null>;
  abstract complete(jobId: string, returnValue: R): Promise<void>;
  abstract fail(jobId: string, error: unknown): Promise<void>;
}
