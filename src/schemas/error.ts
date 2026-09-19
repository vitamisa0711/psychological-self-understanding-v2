/**
 * Error Zod schema
 */

import { z } from "zod";
import { ErrorCode } from "@/types/error";

export const errorCodeSchema = z.nativeEnum(ErrorCode);

export const appErrorSchema = z
  .object({
    code: errorCodeSchema,
    httpStatus: z.number().int(),
    userMessage: z.string(),
    internalMessage: z.string().optional(),
    retryable: z.boolean(),
  })
  .strict();
