import { Injectable } from '@nestjs/common';
import { ErrorContext, ErrorReporter } from './error-reporter';

/**
 * Default {@link ErrorReporter}: does nothing. Server errors are still logged by
 * {@link AllExceptionsFilter}; this only governs whether they're *also* sent to
 * an external tracker. Swap it out (see USAGE.md) to enable reporting.
 */
@Injectable()
export class NoopErrorReporter implements ErrorReporter {
  report(_error: unknown, _context: ErrorContext): void {
    // no-op
  }
}
