import 'reflect-metadata';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigTree } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Route all framework logs through Pino (structured, request-id aware).
  app.useLogger(app.get(PinoLogger));

  const config = app.get(ConfigService<AppConfigTree, true>);
  const appConfig = config.get('app', { infer: true });

  // --- Security -----------------------------------------------------------
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  });

  // --- Routing: global prefix + URI versioning (/api/v1/...) ---------------
  app.setGlobalPrefix(appConfig.globalPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiVersion,
  });

  // --- Validation: strict payloads ----------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Serialization ({@Exclude} on entities) and the { data, meta } envelope are
  // wired as ordered global interceptors in AppModule (order matters — see there).

  // --- API docs (Swagger / OpenAPI) ---------------------------------------
  const docsPath = `${appConfig.globalPrefix}/docs`;
  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${appConfig.name} API`)
    .setDescription('REST API documentation. Click "Authorize" and paste a JWT access token.')
    .setVersion(appConfig.apiVersion)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addCookieAuth('refresh_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(docsPath, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Graceful shutdown hooks (close DB/Redis connections cleanly).
  app.enableShutdownHooks();

  await app.listen(appConfig.port);

  const logger = new Logger('Bootstrap');
  const base = `http://localhost:${appConfig.port}/${appConfig.globalPrefix}`;
  logger.log(`🚀 ${appConfig.name} running on ${base}/v${appConfig.apiVersion} [${appConfig.env}]`);
  logger.log(`📚 API docs at ${base}/docs`);
}

void bootstrap();
