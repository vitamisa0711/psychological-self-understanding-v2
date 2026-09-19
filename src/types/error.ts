/**
 * Error taxonomy — LOCKED SPECIFICATION v1.0.0
 */

export enum ErrorCode {
  INVALID_INPUT = "INVALID_INPUT",
  RATE_LIMITED = "RATE_LIMITED",
  UNAUTHORIZED = "UNAUTHORIZED",
  SAFETY_BLOCK = "SAFETY_BLOCK",
  SAFE_FAILURE = "SAFE_FAILURE",
  AI_TIMEOUT = "AI_TIMEOUT",
  AI_PROVIDER_ERROR = "AI_PROVIDER_ERROR",
  INVALID_AI_OUTPUT = "INVALID_AI_OUTPUT",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export interface AppError {
  code: ErrorCode;
  httpStatus: number;
  /** User-facing message (always Vietnamese) */
  userMessage: string;
  /** Internal only — never sent to client */
  internalMessage?: string;
  retryable: boolean;
}
