import { Injectable } from '@nestjs/common';

import { Producer } from './producer';

@Injectable()
export class ProducerService {
  constructor(private readonly producer: Producer) {}

  async onApplicationBootstrap() {
    let count = 0;

    while (true) {
      await this.wairFor(200);
      await this.producer.add(++count);
    }
  }

  private async wairFor(ms: number) {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
