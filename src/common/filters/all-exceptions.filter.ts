import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import { Request } from 'express';
import { BusinessException, ErrorCode } from '../exceptions/business.exception';

/** Standardized error body returned for every unhandled/handled exception. */
export interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  details?: unknown;
}

/**
 * Global catch-all filter. Normalizes every thrown error into {@link ErrorResponseBody}.
 * Registered as APP_FILTER in AppModule.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    const body = this.buildBody(exception, request);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${body.method} ${body.path} -> ${body.statusCode} ${body.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${body.method} ${body.path} -> ${body.statusCode} ${body.code}`);
    }

    httpAdapter.reply(ctx.getResponse(), body, body.statusCode);
  }

  private buildBody(exception: unknown, request: Request): ErrorResponseBody {
    // pino-http sets `req.id` (string); fall back to the incoming header.
    const reqId = (request as Request & { id?: string | number }).id;
    const headerId = request.headers['x-request-id'];
    const base = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId:
        reqId !== undefined ? String(reqId) : Array.isArray(headerId) ? headerId[0] : headerId,
    };

    // 1. Domain/business exceptions (carry a stable code)
    if (exception instanceof BusinessException) {
      return {
        ...base,
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        error: HttpStatus[exception.getStatus()] ?? 'Error',
        details: exception.details,
      };
    }

    // 2. Standard Nest HttpExceptions (incl. ValidationPipe errors)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const { message, error } = this.extractHttpMessage(response, exception.message);
      return {
        ...base,
        statusCode: status,
        code: this.codeForStatus(status),
        message,
        error: error ?? HttpStatus[status] ?? 'Error',
      };
    }

    // 3. TypeORM query errors (e.g. unique/foreign-key violations)
    if (exception instanceof QueryFailedError) {
      const driverCode = (exception as QueryFailedError & { code?: string }).code;
      const isUnique = driverCode === '23505';
      const status = isUnique ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
      return {
        ...base,
        statusCode: status,
        code: isUnique ? ErrorCode.RESOURCE_CONFLICT : ErrorCode.VALIDATION_FAILED,
        message: isUnique ? 'A record with the same unique value already exists' : 'Database error',
        error: HttpStatus[status],
      };
    }

    // 4. Anything else -> 500 (never leak internals)
    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  private extractHttpMessage(
    response: string | object,
    fallback: string,
  ): { message: string | string[]; error?: string } {
    if (typeof response === 'string') {
      return { message: response };
    }
    const res = response as { message?: string | string[]; error?: string };
    return {
      message: res.message ?? fallback,
      error: res.error,
    };
  }

  private codeForStatus(status: number): string {
    const map: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.RESOURCE_CONFLICT,
    };
    return map[status] ?? ErrorCode.INTERNAL_ERROR;
  }
}
