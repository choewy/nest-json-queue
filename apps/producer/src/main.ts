import { NestFactory } from '@nestjs/core';

import { ProducerModule } from './producer.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ProducerModule);
  await app.init();
}

void bootstrap();
