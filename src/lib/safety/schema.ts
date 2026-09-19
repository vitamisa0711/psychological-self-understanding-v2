/**
 * Safety Zod schemas — PHASE 3
 * LOCKED SPECIFICATION v1.0.0
 */

import { z } from "zod";

export const riskLevelSchema = z.enum([
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
  "UNCERTAIN",
]);

export const safetyConfidenceSchema = z.enum([
  "HIGH",
  "MODERATE",
  "LOW",
  "INSUFFICIENT",
]);

export const signalSeveritySchema = z.enum([
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
]);

export const signalSourceSchema = z.enum(["RULE", "AI", "BOTH"]);

export const safetyCategorySchema = z.enum([
  "SUICIDAL_IDEATION",
  "SELF_HARM",
  "IMMEDIATE_DANGER",
  "VIOLENCE",
  "ABUSE",
  "DOMESTIC_VIOLENCE",
  "SEXUAL_VIOLENCE",
  "SEVERE_EATING_DISORDER_RISK",
  "PSYCHOSIS_LIKE",
  "MANIA_LIKE",
  "MEDICAL_EMERGENCY",
  "CHILD_SAFETY",
]);

export const safetyInputSchema = z
  .object({
    text: z.string().min(1).max(4000),
    language: z.literal("vi"),
    sessionId: z.string().uuid().optional(),
  })
  .strict();

export const safetySignalSchema = z
  .object({
    signalId: z.string().min(1),
    category: safetyCategorySchema,
    severity: signalSeveritySchema,
    evidence: z.array(z.string()),
    confidence: z.enum(["HIGH", "MODERATE", "LOW"]),
    source: signalSourceSchema,
  })
  .strict();

export const safetyClassificationSchema = z
  .object({
    riskLevel: riskLevelSchema,
    signals: z.array(safetySignalSchema),
    confidence: safetyConfidenceSchema,
    rationale: z.string().optional(),
    classifierVersion: z.string().min(1),
    safetyVersion: z.string().min(1),
  })
  .strict();

export const safetyDecisionSchema = z
  .object({
    riskLevel: riskLevelSchema,
    action: z.enum(["CONTINUE_REASONING", "SAFETY_RESPONSE", "SAFE_FAILURE"]),
    shouldRunReasoning: z.boolean(),
    stopReasoning: z.boolean(),
  })
  .strict();

export const safetyResourceSchema = z
  .object({
    name: z.string().min(1),
    contact: z.string().min(1),
  })
  .strict();

export const safetyResponseSchema = z
  .object({
    type: z.literal("SAFETY_RESPONSE"),
    riskLevel: z.enum(["HIGH", "CRITICAL"]),
    message: z.string().min(1),
    emergencyResources: z.array(safetyResourceSchema).optional(),
    version: z.string().min(1),
  })
  .strict();

export const safeFailureSchema = z
  .object({
    type: z.literal("SAFE_FAILURE"),
    riskLevel: z.literal("UNCERTAIN"),
    message: z.string().min(1),
    version: z.string().min(1),
  })
  .strict();
