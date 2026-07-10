import { NestFactory } from '@nestjs/core';

import { ConsumerModule } from './consumer.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ConsumerModule);
  await app.init();
}

void bootstrap();
