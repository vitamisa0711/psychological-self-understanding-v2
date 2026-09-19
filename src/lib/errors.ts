/**
 * Error factory — LOCKED SPECIFICATION v1.0.0
 * User-facing messages always in Vietnamese.
 * Never expose internal details or psychological content.
 */

import { AppError, ErrorCode } from "@/types/error";

const ERROR_MAP: Record<ErrorCode, Omit<AppError, "code" | "internalMessage">> = {
  [ErrorCode.INVALID_INPUT]: {
    httpStatus: 400,
    userMessage: "Nội dung không hợp lệ. Vui lòng kiểm tra lại.",
    retryable: false,
  },
  [ErrorCode.RATE_LIMITED]: {
    httpStatus: 429,
    userMessage: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
    retryable: true,
  },
  [ErrorCode.UNAUTHORIZED]: {
    httpStatus: 401,
    userMessage: "Phiên làm việc không hợp lệ.",
    retryable: false,
  },
  [ErrorCode.SAFETY_BLOCK]: {
    httpStatus: 200, // returns Safety Response body
    userMessage: "", // handled by Safety Response template
    retryable: false,
  },
  [ErrorCode.SAFE_FAILURE]: {
    httpStatus: 200,
    userMessage:
      "Hiện tại hệ thống không thể xử lý yêu cầu này một cách an toàn. Vui lòng thử lại sau.",
    retryable: true,
  },
  [ErrorCode.AI_TIMEOUT]: {
    httpStatus: 503,
    userMessage: "Hệ thống đang bận, vui lòng thử lại sau.",
    retryable: true,
  },
  [ErrorCode.AI_PROVIDER_ERROR]: {
    httpStatus: 503,
    userMessage: "Hệ thống đang bận, vui lòng thử lại sau.",
    retryable: true,
  },
  [ErrorCode.INVALID_AI_OUTPUT]: {
    httpStatus: 500,
    userMessage: "Không thể tạo phân tích phù hợp. Vui lòng thử lại.",
    retryable: true,
  },
  [ErrorCode.VALIDATION_FAILED]: {
    httpStatus: 500,
    userMessage: "Không thể tạo phân tích phù hợp với nguyên tắc sản phẩm.",
    retryable: false,
  },
  [ErrorCode.DATABASE_ERROR]: {
    httpStatus: 500,
    userMessage: "Lỗi hệ thống. Vui lòng thử lại sau.",
    retryable: false,
  },
  [ErrorCode.INTERNAL_ERROR]: {
    httpStatus: 500,
    userMessage: "Lỗi hệ thống. Vui lòng thử lại sau.",
    retryable: false,
  },
};

export function createAppError(
  code: ErrorCode,
  internalMessage?: string
): AppError {
  const base = ERROR_MAP[code];
  return {
    code,
    ...base,
    internalMessage,
  };
}
