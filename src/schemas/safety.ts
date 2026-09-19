/**
 * Safety Zod schemas — LOCKED SPECIFICATION v1.0.0
 */

import { z } from "zod";
import { RiskLevel } from "@/types/safety";

export const riskLevelSchema = z.nativeEnum(RiskLevel);

export const safetySignalSchema = z
  .object({
    category: z.enum([
      "suicidal_ideation",
      "self_harm",
      "violence",
      "abuse",
      "psychosis_like",
      "mania_like",
      "eating_disorder",
      "medical_emergency",
      "child_safety",
      "other",
    ]),
    strength: z.number().min(0).max(1),
    source: z.enum(["rule", "llm"]),
  })
  .strict();

export const safetyClassificationSchema = z
  .object({
    riskLevel: riskLevelSchema,
    signals: z.array(safetySignalSchema),
    reasoning: z.string(),
    disagreement: z.boolean().optional(),
  })
  .strict();

export const safetyDecisionSchema = z
  .object({
    action: z.enum(["ALLOW_ANALYSIS", "SAFETY_RESPONSE", "SAFE_FAILURE"]),
    riskLevel: riskLevelSchema,
    responseTemplateId: z.string().optional(),
  })
  .strict();

export const safetyResponseSchema = z
  .object({
    message: z.string().min(1),
    resources: z.array(
      z.object({
        name: z.string(),
        contact: z.string(),
      })
    ),
    allowContinueAnalysis: z.literal(false),
  })
  .strict();

export const safeFailureResponseSchema = z
  .object({
    message: z.string().min(1),
    allowContinueAnalysis: z.literal(false),
  })
  .strict();
