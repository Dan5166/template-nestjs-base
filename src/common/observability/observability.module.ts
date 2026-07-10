import { Global, Module } from '@nestjs/common';
import { ERROR_REPORTER } from './error-reporter';
import { NoopErrorReporter } from './noop-error-reporter';

/**
 * Provides the app-wide {@link ErrorReporter} under {@link ERROR_REPORTER}.
 * Defaults to the no-op reporter; to enable external error tracking, replace the
 * provider with your own implementation (e.g. a SentryErrorReporter) — the
 * exception filter consumes the token, so nothing else changes.
 *
 * Global so the filter (and anything else) can inject it without re-importing.
 */
@Global()
@Module({
  providers: [{ provide: ERROR_REPORTER, useClass: NoopErrorReporter }],
  exports: [ERROR_REPORTER],
})
export class ObservabilityModule {}
