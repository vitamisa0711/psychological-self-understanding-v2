/**
 * Zod schemas for Intermediate Representation
 * LOCKED SPECIFICATION v1.0.0
 */

import { z } from "zod";
import { InformationType, ConfidenceLevel } from "@/types/information";

export const informationTypeSchema = z.nativeEnum(InformationType);
export const confidenceLevelSchema = z.nativeEnum(ConfidenceLevel);

export const extractedFactSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1).max(2000),
    type: z.literal(InformationType.USER_FACT),
    sourceSpan: z.string().optional(),
    confidence: confidenceLevelSchema,
  })
  .strict();

export const interpretationSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1).max(2000),
    type: z.literal(InformationType.USER_INTERPRETATION),
    relatedFactIds: z.array(z.string()),
    confidence: confidenceLevelSchema,
  })
  .strict();

export const emotionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(200),
    intensity: z.enum(["low", "medium", "high"]).optional(),
    type: z.union([
      z.literal(InformationType.USER_FACT),
      z.literal(InformationType.AI_INFERENCE),
    ]),
    evidence: z.array(z.string()),
    confidence: confidenceLevelSchema,
  })
  .strict();

export const automaticThoughtSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1).max(2000),
    type: informationTypeSchema,
    relatedEmotionIds: z.array(z.string()).optional(),
    confidence: confidenceLevelSchema,
  })
  .strict();

export const behaviorSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1).max(2000),
    type: z.union([
      z.literal(InformationType.USER_FACT),
      z.literal(InformationType.AI_INFERENCE),
    ]),
    evidence: z.array(z.string()),
    confidence: confidenceLevelSchema,
  })
  .strict();

export const triggerSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1).max(2000),
    type: informationTypeSchema,
    confidence: confidenceLevelSchema,
  })
  .strict();

export const possibleNeedSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(200),
    type: z.union([
      z.literal(InformationType.AI_INFERENCE),
      z.literal(InformationType.HYPOTHESIS),
    ]),
    confidence: confidenceLevelSchema,
    evidence: z.array(z.string()),
  })
  .strict();

export const maintainingLoopSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1).max(2000),
    steps: z.array(z.string()).min(1),
    confidence: confidenceLevelSchema,
    evidence: z.array(z.string()),
  })
  .strict();

export const pastExperienceSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1).max(2000),
    type: informationTypeSchema,
    confidence: confidenceLevelSchema,
  })
  .strict();

export const psychologicalConceptMatchSchema = z
  .object({
    conceptId: z.string().min(1),
    nameVi: z.string().min(1),
    nameEn: z.string().min(1),
    similarityScore: z.number().min(0).max(1),
    matchedFeatures: z.array(z.string()),
    confidence: confidenceLevelSchema,
    whenNotToInferTriggered: z.boolean(),
  })
  .strict();

export const uncertaintySchema = z
  .object({
    overall: confidenceLevelSchema,
    missingInformation: z.array(z.string()),
    openQuestions: z.array(z.string()),
  })
  .strict();
