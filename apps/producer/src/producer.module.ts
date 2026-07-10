import { Module } from '@nestjs/common';

import { JsonQueueModule } from '@libs';

import { ProducerService } from './producer.service';

@Module({
  imports: [
    JsonQueueModule.forRoot([
      {
        name: 'test',
        options: { basePath: '.temp' },
      },
    ]),
  ],
  providers: [ProducerService],
})
export class ProducerModule {}
