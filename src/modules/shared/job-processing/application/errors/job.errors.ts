/**
 * Base class for all job-related errors
 */
export abstract class JobError extends Error {
  public readonly isRetryable: boolean;
  public readonly errorCode: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    isRetryable: boolean,
    errorCode: string,
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.isRetryable = isRetryable;
    this.errorCode = errorCode;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      isRetryable: this.isRetryable,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Transient errors that should be retried
 */
export class TransientJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "TRANSIENT_ERROR", context);
  }
}

/**
 * Permanent errors that should NOT be retried
 */
export class PermanentJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, false, "PERMANENT_ERROR", context);
  }
}

/**
 * Network-related errors (retryable)
 */
export class NetworkJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "NETWORK_ERROR", context);
  }
}

/**
 * Database-related errors (retryable)
 */
export class DatabaseJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "DATABASE_ERROR", context);
  }
}

/**
 * Validation errors (NOT retryable - data is invalid)
 */
export class ValidationJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, false, "VALIDATION_ERROR", context);
  }
}

/**
 * External service errors (retryable)
 */
export class ExternalServiceJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "EXTERNAL_SERVICE_ERROR", context);
  }
}

/**
 * Rate limit errors (retryable with longer delay)
 */
export class RateLimitJobError extends JobError {
  public readonly retryAfter?: number; // milliseconds

  constructor(
    message: string,
    retryAfter?: number,
    context?: Record<string, any>,
  ) {
    super(message, true, "RATE_LIMIT_ERROR", context);
    this.retryAfter = retryAfter;
  }
}

/**
 * Timeout errors (retryable)
 */
export class TimeoutJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "TIMEOUT_ERROR", context);
  }
}

/**
 * Business logic errors (NOT retryable)
 */
export class BusinessLogicJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, false, "BUSINESS_LOGIC_ERROR", context);
  }
}

/**
 * Resource not found errors (NOT retryable)
 */
export class ResourceNotFoundJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, false, "RESOURCE_NOT_FOUND", context);
  }
}

/**
 * Insufficient resources errors (retryable)
 */
export class InsufficientResourcesJobError extends JobError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, true, "INSUFFICIENT_RESOURCES", context);
  }
}

/**
 * Helper function to determine if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof JobError) {
    return error.isRetryable;
  }

  // Check for common retryable error patterns
  const retryablePatterns = [
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /ENETUNREACH/i,
    /timeout/i,
    /network/i,
    /connection/i,
    /503/i,
    /502/i,
    /504/i,
    /429/i, // Rate limit
  ];

  return retryablePatterns.some(
    (pattern) => pattern.test(error.message) || pattern.test(error.name),
  );
}

/**
 * Helper function to categorize unknown errors
 */
export function categorizeError(error: Error): JobError {
  if (error instanceof JobError) {
    return error;
  }

  // Network errors
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ENETUNREACH/i.test(error.message)) {
    return new NetworkJobError(error.message, { originalError: error.name });
  }

  // Timeout errors
  if (/timeout/i.test(error.message)) {
    return new TimeoutJobError(error.message, { originalError: error.name });
  }

  // Rate limit errors
  if (/429|rate limit/i.test(error.message)) {
    return new RateLimitJobError(error.message, undefined, {
      originalError: error.name,
    });
  }

  // Database errors
  if (/database|sql|query|prisma/i.test(error.message)) {
    return new DatabaseJobError(error.message, { originalError: error.name });
  }

  // Validation errors
  if (/validation|invalid|required|missing/i.test(error.message)) {
    return new ValidationJobError(error.message, { originalError: error.name });
  }

  // Default to transient error (retryable)
  return new TransientJobError(error.message, { originalError: error.name });
}

/**
 * Helper function to get retry delay based on error type
 */
export function getRetryDelay(error: Error, attemptNumber: number): number {
  if (error instanceof RateLimitJobError && error.retryAfter) {
    return error.retryAfter;
  }

  if (error instanceof JobError) {
    // Exponential backoff: 2^attempt * 1000ms
    // Attempt 1: 2s, Attempt 2: 4s, Attempt 3: 8s
    const baseDelay = Math.pow(2, attemptNumber) * 1000;

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;

    // Cap at 60 seconds
    return Math.min(baseDelay + jitter, 60000);
  }

  // Default exponential backoff
  return Math.min(Math.pow(2, attemptNumber) * 1000, 60000);
}
