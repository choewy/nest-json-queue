import { Module } from '@nestjs/common';

import { JsonQueueModule } from '@libs';

import { JsonQueueJobProducer } from './json-queue-job.producer';
import { Producer } from './producer';
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
  providers: [
    ProducerService,
    {
      provide: Producer,
      useClass: JsonQueueJobProducer,
    },
  ],
})
export class ProducerModule {}
