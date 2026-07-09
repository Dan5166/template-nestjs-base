import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Machine-readable error codes surfaced to API clients in the `code` field.
 * Keep these stable — clients may branch on them.
 */
export enum ErrorCode {
  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // Auth (used from Phase 5 onward)
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',

  // Users
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
}

export interface BusinessExceptionPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Base class for domain/business errors. Unlike raw HttpException, it always
 * carries a stable `code`, so the global filter can emit a consistent shape.
 */
export class BusinessException extends HttpException {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    super({ code, message, details } satisfies BusinessExceptionPayload, status);
    this.code = code;
    this.details = details;
  }
}

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, identifier?: string | number, code = ErrorCode.RESOURCE_NOT_FOUND) {
    const message = identifier
      ? `${resource} with identifier "${identifier}" was not found`
      : `${resource} was not found`;
    super(code, message, HttpStatus.NOT_FOUND);
  }
}

export class ResourceConflictException extends BusinessException {
  constructor(message: string, code = ErrorCode.RESOURCE_CONFLICT, details?: unknown) {
    super(code, message, HttpStatus.CONFLICT, details);
  }
}

export class ValidationException extends BusinessException {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.VALIDATION_FAILED, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

export class ForbiddenBusinessException extends BusinessException {
  constructor(message = 'You do not have permission to perform this action') {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

export class UnauthorizedBusinessException extends BusinessException {
  constructor(message = 'Authentication is required', code = ErrorCode.UNAUTHORIZED) {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}
