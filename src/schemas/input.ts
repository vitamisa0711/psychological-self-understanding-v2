/**
 * Zod schema for PsychologicalInput
 * LOCKED SPECIFICATION v1.0.0
 */

import { z } from "zod";
import { MAX_INPUT_LENGTH, MIN_INPUT_LENGTH } from "@/lib/config/constants";

export const psychologicalInputSchema = z
  .object({
    text: z
      .string()
      .min(MIN_INPUT_LENGTH, `Tối thiểu ${MIN_INPUT_LENGTH} ký tự`)
      .max(MAX_INPUT_LENGTH, `Tối đa ${MAX_INPUT_LENGTH} ký tự`),
    sessionId: z.string().uuid().optional(),
    language: z.literal("vi"),
    maxLength: z.number().int().positive().default(MAX_INPUT_LENGTH),
  })
  .strict();

export type PsychologicalInputSchema = z.infer<typeof psychologicalInputSchema>;
