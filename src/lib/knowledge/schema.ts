/**
 * Zod schemas for Knowledge Base — PHASE 2
 * LOCKED SPECIFICATION v1.0.0
 * Public objects use .strict()
 */

import { z } from "zod";

export const knowledgeStatusSchema = z.enum([
  "DRAFT",
  "REVIEW",
  "VERIFIED",
  "REJECTED",
]);

export const evidenceStrengthSchema = z.enum([
  "VERY_STRONG",
  "STRONG",
  "MODERATE",
  "LIMITED",
  "INSUFFICIENT",
]);

export const clinicalScopeSchema = z.enum([
  "NON_CLINICAL",
  "CLINICAL_RELEVANT",
  "MIXED",
]);

export const sourceTypeSchema = z.enum([
  "SYSTEMATIC_REVIEW",
  "META_ANALYSIS",
  "CLINICAL_GUIDELINE",
  "PEER_REVIEWED",
  "TEXTBOOK",
  "PROFESSIONAL_ORGANIZATION",
  "UNIVERSITY",
  "GOVERNMENT",
  "OTHER",
]);

export const knowledgeSourceSchema = z
  .object({
    source_id: z.string().min(1),
    title: z.string().min(1),
    authors: z.array(z.string()).optional(),
    year: z.number().int().min(1800).max(2100),
    source_type: sourceTypeSchema,
    publisher: z.string().optional(),
    journal: z.string().optional(),
    doi: z.string().optional(),
    url: z.string().url().optional(),
  })
  .strict();

export const evidenceRecordSchema = z
  .object({
    evidence_id: z.string().min(1),
    claim: z.string().min(1),
    evidence_strength: evidenceStrengthSchema,
    source_ids: z.array(z.string().min(1)).min(1),
    limitations: z.array(z.string()),
    notes: z.string().optional(),
  })
  .strict();

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const knowledgeConceptSchema = z
  .object({
    concept_id: z.string().min(1),
    name_vi: z.string().min(1),
    name_en: z.string().min(1),
    domain: z.string().min(1),
    subcategory: z.string().optional(),
    definition: z.string().min(1),
    mechanism: z.array(z.string()).min(1),
    common_triggers: z.array(z.string()),
    associated_thoughts: z.array(z.string()),
    associated_emotions: z.array(z.string()),
    associated_behaviors: z.array(z.string()),
    maintaining_factors: z.array(z.string()),
    protective_factors: z.array(z.string()),
    related_concepts: z.array(z.string()),
    alternative_explanations: z.array(z.string()).min(1),
    misconceptions: z.array(z.string()),
    limitations: z.array(z.string()).min(1),
    evidence_strength: evidenceStrengthSchema,
    clinical_or_nonclinical: clinicalScopeSchema,
    when_not_to_infer: z.array(z.string()).min(1),
    evidence: z.array(evidenceRecordSchema).min(1),
    sources: z.array(knowledgeSourceSchema).min(1),
    status: knowledgeStatusSchema,
    version: z.string().min(1),
    last_reviewed: z.string().regex(isoDateRegex, "last_reviewed must be YYYY-MM-DD"),
  })
  .strict()
  .superRefine((concept, ctx) => {
    const sourceIds = new Set(concept.sources.map((s) => s.source_id));
    for (const ev of concept.evidence) {
      for (const sid of ev.source_ids) {
        if (!sourceIds.has(sid)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Evidence ${ev.evidence_id} references missing source_id: ${sid}`,
            path: ["evidence"],
          });
        }
      }
    }
  });

export type KnowledgeConceptParsed = z.infer<typeof knowledgeConceptSchema>;
