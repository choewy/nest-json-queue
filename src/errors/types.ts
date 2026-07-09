export type JsonQueueErrorCode =
  | 'JSON_QUEUE_LOCK_TIMEOUT'
  | 'JSON_QUEUE_INVALID_JOB_FILENAME'
  | 'JSON_QUEUE_JOB_NOT_FOUND'
  | 'JSON_QUEUE_INVALID_META_FILE'
  | 'JSON_QUEUE_INVALID_WAITING_FILE'
  | 'JSON_QUEUE_FILE_READ_FAILED'
  | 'JSON_QUEUE_FILE_WRITE_FAILED'
  | 'JSON_QUEUE_FILE_MOVE_FAILED';

export type JsonQueueErrorOptions = {
  code: JsonQueueErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
};
