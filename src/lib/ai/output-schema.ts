/**
 * Structured AI generation output schema — PHASE 8
 */

import { z } from "zod";

export const aiHypothesisSchema = z
  .object({
    conceptId: z.string().optional(),
    label: z.string().min(1),
    evidence: z.array(z.string()),
    fit: z.string().min(1),
    missingData: z.array(z.string()),
    alternatives: z.array(z.string()),
    confidence: z.enum(["LOW", "MODERATE", "HIGH"]),
  })
  .strict();

export const aiFormulationSchema = z
  .object({
    status: z.enum(["OK", "INSUFFICIENT_DATA", "SAFETY_STOP", "GENERATION_FAILED"]),
    event: z.string().optional(),
    interpretation: z.string().optional(),
    emotions: z.array(z.string()).optional(),
    automaticThoughts: z.array(z.string()).optional(),
    behaviors: z.array(z.string()).optional(),
    triggers: z.array(z.string()).optional(),
    needs: z.array(z.string()).optional(),
    maintainingLoop: z.string().optional(),
    learningHistory: z
      .object({
        evidencePresent: z.boolean(),
        description: z.string().optional(),
        causalStatus: z.enum(["UNKNOWN", "POSSIBLE", "SUPPORTED"]).optional(),
      })
      .strict()
      .optional(),
    hypotheses: z.array(aiHypothesisSchema).max(4).optional(),
    alternativeExplanations: z.array(z.string()).optional(),
    uncertainty: z.array(z.string()).optional(),
    reflectiveQuestions: z.array(z.string()).optional(),
    knowledgeReferences: z.array(z.string()).optional(),
    failureReason: z.string().optional(),
  })
  .strict();

export type AIFormulation = z.infer<typeof aiFormulationSchema>;
export type AIHypothesis = z.infer<typeof aiHypothesisSchema>;
