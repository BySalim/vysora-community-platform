import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configurerApplication } from './application.js';
import { lireConfiguration } from './config/env.js';

const config = lireConfiguration();
const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
configurerApplication(app);
await app.listen(config.API_PORT);
