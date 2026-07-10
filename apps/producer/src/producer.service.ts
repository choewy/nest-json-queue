import { Injectable } from '@nestjs/common';

import { InjectJsonQueue, JsonQueue } from '@libs';

@Injectable()
export class ProducerService {
  constructor(
    @InjectJsonQueue('test')
    private readonly queue: JsonQueue,
  ) {}

  async onApplicationBootstrap() {
    while (true) {
      await this.wairFor(1);
      await this.queue.add({});
    }
  }

  private async wairFor(seconds: number) {
    await new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
  }
}
