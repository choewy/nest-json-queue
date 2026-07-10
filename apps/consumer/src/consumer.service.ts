import { Injectable } from '@nestjs/common';

import { TestJobData, TestJobReturnValue } from './types';

@Injectable()
export class ConsumerService {
  private processed = 0;

  async handleProcess(data: TestJobData): Promise<TestJobReturnValue> {
    console.log({
      processed: ++this.processed,
      data,
    });

    await this.wairFor(500);

    return { ok: true };
  }

  private async wairFor(ms: number) {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
