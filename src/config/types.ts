import { JsonQueueOptions, JsonQueuePaths } from '../types';

export type JsonQueueResolvedOptions = Required<JsonQueueOptions>;
export type JsonQueueOptionResolvedResult = {
  options: JsonQueueResolvedOptions;
  paths: JsonQueuePaths;
};
