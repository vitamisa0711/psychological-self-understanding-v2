/**
 * Reasoning Zod schemas — PHASE 6
 */

import { z } from "zod";

export const formulationStatusSchema = z.enum([
  "VALID",
  "INSUFFICIENT_DATA",
  "SAFETY_GATED",
  "UNCERTAIN",
]);

export const confidenceSchema = z.enum(["HIGH", "MODERATE", "LOW", "UNCERTAIN"]);
export const fitSchema = z.enum(["HIGH", "MODERATE", "LOW", "UNCERTAIN"]);

export const psychologicalHypothesisSchema = z
  .object({
    hypothesis_id: z.string().min(1),
    concept_id: z.string().optional(),
    label: z.string().min(1),
    formulation: z.string().min(1),
    supporting_evidence: z.array(
      z
        .object({
          kind: z.enum(["user", "knowledge", "inference", "unknown"]),
          description: z.string(),
          concept_id: z.string().optional(),
          source_id: z.string().optional(),
        })
        .strict()
    ),
    fit: z
      .object({
        level: fitSchema,
        explanation: z.string(),
      })
      .strict(),
    missing_data: z.array(z.string()),
    alternative_explanations: z.array(z.string()),
    contradictory_evidence: z.array(z.string()),
    confidence: z
      .object({
        level: confidenceSchema,
        explanation: z.string(),
      })
      .strict(),
    evidence_strength: z
      .enum(["VERY_STRONG", "STRONG", "MODERATE", "LIMITED", "INSUFFICIENT"])
      .optional(),
    knowledge_refs: z
      .array(
        z
          .object({
            concept_id: z.string(),
            name_vi: z.string(),
            name_en: z.string(),
            evidence_strength: z
              .enum([
                "VERY_STRONG",
                "STRONG",
                "MODERATE",
                "LIMITED",
                "INSUFFICIENT",
              ])
              .optional(),
          })
          .strict()
      )
      .optional(),
  })
  .strict();

export const psychologicalFormulationSchema = z
  .object({
    formulation_id: z.string().min(1),
    status: formulationStatusSchema,
    summary: z.string(),
    observations: z.array(
      z
        .object({
          id: z.string(),
          text: z.string(),
          kind: z.enum(["user_stated", "observable_from_text"]),
        })
        .strict()
    ),
    event: z.object({ description: z.string() }).strict(),
    interpretation: z.array(
      z
        .object({
          id: z.string(),
          text: z.string(),
          source: z.enum(["user_reported", "inferred"]),
          confidence: confidenceSchema,
        })
        .strict()
    ),
    emotions: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          confidence: confidenceSchema,
          source: z.enum(["reported", "inferred"]),
        })
        .strict()
    ),
    automatic_thoughts: z.array(
      z
        .object({
          id: z.string(),
          text: z.string(),
          source: z.enum(["reported", "inferred", "uncertain"]),
        })
        .strict()
    ),
    behaviors: z.array(
      z
        .object({
          id: z.string(),
          text: z.string(),
          source: z.enum(["reported", "inferred"]),
        })
        .strict()
    ),
    triggers: z.array(
      z
        .object({
          id: z.string(),
          text: z.string(),
          confidence: confidenceSchema,
        })
        .strict()
    ),
    needs: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          explanation: z.string(),
          confidence: confidenceSchema,
        })
        .strict()
    ),
    maintaining_loops: z.array(
      z
        .object({
          id: z.string(),
          steps: z.array(z.string()),
          explanation: z.string(),
          confidence: confidenceSchema,
        })
        .strict()
    ),
    learning_history: z
      .object({
        present: z.boolean(),
        note: z.string(),
      })
      .strict()
      .optional(),
    hypotheses: z.array(psychologicalHypothesisSchema),
    unresolved_questions: z.array(z.string()),
    uncertainty: z
      .object({
        known: z.array(z.string()),
        inferred: z.array(z.string()),
        missing: z.array(z.string()),
        why_missing_matters: z.array(z.string()),
      })
      .strict(),
    evidence_trace: z.array(
      z
        .object({
          hypothesis_id: z.string(),
          concept_id: z.string().optional(),
          source_ids: z.array(z.string()),
          status: z.enum(["TRACED", "INSUFFICIENT", "UNSUPPORTED"]),
        })
        .strict()
    ),
    language_flags: z
      .object({
        advice_detected: z.boolean(),
        diagnosis_detected: z.boolean(),
        unsupported_certainty_detected: z.boolean(),
      })
      .strict()
      .optional(),
    engine_version: z.string(),
    knowledge_version: z.string().optional(),
  })
  .strict();
