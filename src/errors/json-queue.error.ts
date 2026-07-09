import { JsonQueueErrorCode, JsonQueueErrorOptions } from './types';

export class JsonQueueError extends Error {
  readonly code: JsonQueueErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(options: JsonQueueErrorOptions) {
    super(options.message, { cause: options.cause });

    this.name = 'JsonQueueError';
    this.code = options.code;
    this.context = options.context;
  }

  static isFileExistsError(e: unknown) {
    return typeof e === 'object' && e !== null && 'code' in e && e.code === 'EEXIST';
  }

  static lockTimeout(queueName: string): JsonQueueError {
    return new JsonQueueError({
      code: 'JSON_QUEUE_LOCK_TIMEOUT',
      message: `JsonQueue lock timeout. queue=${queueName}`,
      context: { queueName },
    });
  }

  static invalidJobFilename(filename: string): JsonQueueError {
    return new JsonQueueError({
      code: 'JSON_QUEUE_INVALID_JOB_FILENAME',
      message: `Invalid JsonQueue job filename. filename=${filename}`,
      context: { filename },
    });
  }

  static jobNotFound(id: string): JsonQueueError {
    return new JsonQueueError({
      code: 'JSON_QUEUE_JOB_NOT_FOUND',
      message: `JsonQueue job not found. id=${id}`,
      context: { id },
    });
  }

  static invalidMetaFile(filePath: string, cause?: unknown): JsonQueueError {
    return new JsonQueueError({
      code: 'JSON_QUEUE_INVALID_META_FILE',
      message: `Invalid JsonQueue meta file. filePath=${filePath}`,
      cause,
      context: { filePath },
    });
  }

  static invalidWaitingFile(filePath: string, cause?: unknown): JsonQueueError {
    return new JsonQueueError({
      code: 'JSON_QUEUE_INVALID_WAITING_FILE',
      message: `Invalid JsonQueue waiting file. filePath=${filePath}`,
      cause,
      context: { filePath },
    });
  }

  static fileReadFailed(filePath: string, cause?: unknown): JsonQueueError {
    return new JsonQueueError({
      code: 'JSON_QUEUE_FILE_READ_FAILED',
      message: `Failed to read JsonQueue file. filePath=${filePath}`,
      cause,
      context: { filePath },
    });
  }

  static fileWriteFailed(filePath: string, cause?: unknown): JsonQueueError {
    return new JsonQueueError({
      code: 'JSON_QUEUE_FILE_WRITE_FAILED',
      message: `Failed to write JsonQueue file. filePath=${filePath}`,
      cause,
      context: { filePath },
    });
  }

  static fileMoveFailed(from: string, to: string, cause?: unknown): JsonQueueError {
    return new JsonQueueError({
      code: 'JSON_QUEUE_FILE_MOVE_FAILED',
      message: `Failed to move JsonQueue file. from=${from}, to=${to}`,
      cause,
      context: { from, to },
    });
  }
}
