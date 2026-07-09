import { JSON_QUEUE_TOKEN_PREFIX } from './constants';

export const getJsonQueueToken = (name: string) => `${JSON_QUEUE_TOKEN_PREFIX}_${name}`;
