import { Injectable } from '@nestjs/common';

import { InjectJsonQueue, JsonQueue } from '@libs';

import { Producer } from './producer';
import { TestJobData, TestJobReturnValue } from './types';

@Injectable()
export class JsonQueueJobProducer implements Producer {
  constructor(
    @InjectJsonQueue('test')
    private queue: JsonQueue<TestJobData, TestJobReturnValue>,
  ) {}

  async add(count: number): Promise<string> {
    return this.queue.add({
      id: count,
      createdBy: JsonQueueJobProducer.name,
      createdAt: new Date(),
    });
  }
}
