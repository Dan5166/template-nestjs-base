/**
 * Seam for shipping unhandled/server errors to an external tracker (Sentry,
 * OpenTelemetry, Rollbar, …). The template ships a {@link NoopErrorReporter} so
 * nothing is sent by default; bind a real implementation to {@link ERROR_REPORTER}
 * to turn it on — no changes to the exception filter needed.
 *
 * See USAGE.md → "Error reporting / observability" for a Sentry example.
 */
export interface ErrorContext {
  /** HTTP method of the failed request. */
  method: string;
  /** Request path. */
  path: string;
  /** Final HTTP status code (only >= 500 reach the reporter). */
  statusCode: number;
  /** Stable error code from the response envelope. */
  code: string;
  /** Correlation id (pino-http `req.id` / `x-request-id`), when present. */
  requestId?: string;
}

export interface ErrorReporter {
  /** Report a server-side error. Must never throw. */
  report(error: unknown, context: ErrorContext): void;
}

/** DI token for the active {@link ErrorReporter}. */
export const ERROR_REPORTER = Symbol('ERROR_REPORTER');
