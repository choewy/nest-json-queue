import { Injectable } from '@nestjs/common';

import { Producer } from './producer';

@Injectable()
export class ProducerService {
  constructor(private readonly producer: Producer) {}

  async onApplicationBootstrap() {
    let count = 0;

    while (true) {
      await this.wairFor(1);
      await this.producer.add(++count);
    }
  }

  private async wairFor(seconds: number) {
    await new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
  }
}
