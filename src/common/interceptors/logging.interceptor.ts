import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logs each HTTP request with its method, path, status code and duration.
 * In Phase 8 this is superseded by Pino's request logger, but it works
 * standalone with the default logger meanwhile.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const { method, originalUrl } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse<Response>();
          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} +${Date.now() - start}ms`,
          );
        },
        error: (err: { status?: number }) => {
          const status = err?.status ?? 500;
          this.logger.warn(`${method} ${originalUrl} ${status} +${Date.now() - start}ms`);
        },
      }),
    );
  }
}
