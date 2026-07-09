import { Injectable } from '@nestjs/common';

import { JsonQueueError } from '../errors';
import { JsonQueueParsedJobFilename } from '../types';

@Injectable()
export class JsonQueueFilename {
  private static readonly JobFilenamePattern = /^job-(\d+)-(.+)\.json$/;

  create(cursor: number, jobId: string): string {
    if (!Number.isSafeInteger(cursor) || cursor < 1) {
      throw JsonQueueError.invalidJobFilename(`job-${cursor}-${jobId}.json`);
    }

    if (!jobId.trim()) {
      throw JsonQueueError.invalidJobFilename(`job-${cursor}-${jobId}.json`);
    }

    return `job-${cursor}-${jobId}.json`;
  }

  parse(filename: string): JsonQueueParsedJobFilename | null {
    const matched = JsonQueueFilename.JobFilenamePattern.exec(filename);

    if (!matched) {
      return null;
    }

    const cursor = Number(matched[1]);
    const jobId = matched[2];

    if (!Number.isSafeInteger(cursor) || cursor < 1 || !jobId) {
      return null;
    }

    return { cursor, jobId };
  }

  getCursor(filename: string): number | null {
    return this.parse(filename)?.cursor ?? null;
  }

  getJobId(filename: string): string | null {
    return this.parse(filename)?.jobId ?? null;
  }

  compare(a: string, b: string): number {
    const aCursor = this.getCursor(a) ?? Number.MAX_SAFE_INTEGER;
    const bCursor = this.getCursor(b) ?? Number.MAX_SAFE_INTEGER;

    if (aCursor !== bCursor) {
      return aCursor - bCursor;
    }

    return a.localeCompare(b);
  }

  isJobFilename(filename: string): boolean {
    return this.parse(filename) !== null;
  }
}
