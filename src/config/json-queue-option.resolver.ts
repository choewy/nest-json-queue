// path/json-queue-path.resolver.ts

import { Injectable } from '@nestjs/common';

import { resolve } from 'node:path';

import { type JsonQueueOptions, JsonQueuePaths } from '../types';

import { JsonQueueOptionResolvedResult, JsonQueueResolvedOptions } from './types';

@Injectable()
export class JsonQueueOptionResolver {
  resolve(name: string, options: JsonQueueOptions): JsonQueueOptionResolvedResult {
    const resolvedOptions = this.resolveOptions(name, options);

    return {
      options: resolvedOptions,
      paths: this.resolvePaths(resolvedOptions.basePath),
    };
  }

  private resolveOptions(name: string, options: JsonQueueOptions): JsonQueueResolvedOptions {
    return {
      basePath: resolve(process.cwd(), options.basePath ?? 'jsonqueue', name.toLowerCase()),
      maxAttempts: options.maxAttempts ?? 1,
      processingTimeout: options.processingTimeout ?? 60_000,
      lockTimeout: options.lockTimeout ?? 10_000,
      lockRetryDelay: options.lockRetryDelay ?? 50,
      completedLimit: options.completedLimit ?? 1000,
      failedLimit: options.failedLimit ?? 1000,
    };
  }

  private resolvePaths(basePath: string): JsonQueuePaths {
    return {
      waiting: resolve(basePath, 'waiting.json'),
      meta: resolve(basePath, 'meta.json'),
      lock: resolve(basePath, 'queue.lock'),
      jobs: resolve(basePath, 'jobs'),
      processing: resolve(basePath, 'processing'),
      completed: resolve(basePath, 'completed'),
      failed: resolve(basePath, 'failed'),
      tmp: resolve(basePath, 'tmp'),
    };
  }
}
