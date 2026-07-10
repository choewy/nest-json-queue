import { Module } from '@nestjs/common';

import { JsonQueueModule } from '@libs';

import { ConsumerProcessor } from './consumer.processor';
import { ConsumerService } from './consumer.service';

@Module({
  imports: [
    JsonQueueModule.forRoot([
      {
        name: 'test',
        options: {
          basePath: '.temp',
          completedLimit: 10,
        },
      },
    ]),
  ],
  providers: [ConsumerService, ConsumerProcessor],
})
export class ConsumerModule {}
