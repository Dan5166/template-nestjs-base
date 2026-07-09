import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { IncomingMessage, ServerResponse } from 'http';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigTree } from '../../config';

/**
 * Structured logging with Pino. Provides:
 *  - per-request `x-request-id` (echoed back, and read by the exceptions filter)
 *  - redaction of auth headers / secret-ish fields
 *  - pretty output in dev (`LOG_PRETTY=true`), JSON in prod
 *
 * Imported once in AppModule; `main.ts` promotes it to the app logger.
 */
export const AppLoggerModule = LoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfigTree, true>) => {
    const log = config.get('log', { infer: true });
    return {
      pinoHttp: {
        level: log.level,
        transport: log.pretty
          ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:standard' } }
          : undefined,
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const existing = req.headers['x-request-id'];
          const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            '*.password',
            '*.accessToken',
            '*.refreshToken',
          ],
          remove: true,
        },
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        // Health checks are noisy; drop them to trace level.
        autoLogging: {
          ignore: (req: IncomingMessage) => (req.url ?? '').includes('/health'),
        },
      },
    };
  },
});
