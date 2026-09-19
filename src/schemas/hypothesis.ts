/**
 * Hypothesis Zod schema — LOCKED SPECIFICATION v1.0.0
 */

import { z } from "zod";
import { confidenceLevelSchema } from "./intermediate";

export const evidenceReferenceSchema = z
  .object({
    type: z.enum(["user_text", "knowledge_claim"]),
    reference: z.string().min(1),
    strength: confidenceLevelSchema,
  })
  .strict();

export const hypothesisSchema = z
  .object({
    id: z.string().min(1),
    conceptId: z.string().optional(),
    title: z.string().min(1).max(300),
    explanation: z.string().min(1).max(2000),
    supportingEvidence: z.array(evidenceReferenceSchema),
    missingEvidence: z.array(z.string()),
    contradictoryEvidence: z.array(z.string()),
    alternativeExplanations: z.array(z.string()),
    confidence: confidenceLevelSchema,
    whenNotToInfer: z.array(z.string()),
    clinicalBoundaryNote: z.string().max(500).optional(),
  })
  .strict();
