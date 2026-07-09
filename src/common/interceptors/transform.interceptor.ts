import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';
import { Paginated, PaginationMeta } from '../interfaces/paginated-result.interface';

export interface ResponseMeta {
  timestamp: string;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  data: T;
  meta: ResponseMeta;
}

/**
 * Wraps every successful response in a consistent envelope:
 *   { data: <payload>, meta: { timestamp, ...pagination } }
 *
 * A {@link Paginated} payload is flattened so `data` is the items array and its
 * pagination info is merged into `meta`. Opt out per-handler with `@RawResponse()`.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((payload): ApiResponse<T> | T => {
        if (isRaw) return payload;

        const timestamp = new Date().toISOString();

        if (payload instanceof Paginated) {
          const meta: ResponseMeta & PaginationMeta = { timestamp, ...payload.meta };
          return { data: payload.items as unknown as T, meta };
        }

        return { data: payload, meta: { timestamp } };
      }),
    );
  }
}
