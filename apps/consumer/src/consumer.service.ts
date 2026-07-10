import { Injectable } from '@nestjs/common';

import { TestJobData, TestJobReturnValue } from './types';

@Injectable()
export class ConsumerService {
  handleProcess(data: TestJobData): TestJobReturnValue {
    console.log(data);

    return { ok: true };
  }
}
