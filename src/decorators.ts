import { applyDecorators, Inject, Injectable, SetMetadata } from '@nestjs/common';

import { JSON_QUEUE_PROCESSOR } from './constants';
import { getJsonQueueToken } from './helpers';

export const InjectJsonQueue = (name: string) => Inject(getJsonQueueToken(name));
export const JsonQueueProcessor = (queueName: string): ClassDecorator => applyDecorators(Injectable, SetMetadata(JSON_QUEUE_PROCESSOR, queueName));
