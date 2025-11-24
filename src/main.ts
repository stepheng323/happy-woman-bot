import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Env } from './config/env.schema';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService<Env>);

  // Get configuration
  const port = configService.get('PORT', { infer: true }) ?? 3000;
  // const apiPrefix = configService.get('API_PREFIX', { infer: true }) ?? 'api';
  // const apiVersion = configService.get('API_VERSION', { infer: true }) ?? 'v1';
  const nodeEnv =
    configService.get('NODE_ENV', { infer: true }) ?? 'development';
  const corsOrigin = configService.get('CORS_ORIGIN', { infer: true }) ?? '*';

  // Global prefix
  // app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  // Enable CORS
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    credentials: true,
  });

  // Global validation pipe with Zod
  app.useGlobalPipes(new ZodValidationPipe());

  // Swagger/OpenAPI documentation (only in development)
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Happy Woman Bot API')
      .setDescription(
        'WhatsApp Bot API for handling webhooks and sending messages',
      )
      .setVersion('1.0')
      .addTag('webhook', 'WhatsApp webhook endpoints')
      .addTag('flow', 'WhatsApp Flow endpoints')
      .addTag('health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`/docs`, app, document);

    logger.log(`Swagger documentation available at /docs`);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error);
  process.exit(1);
});
