/**
 * Knowledge Base Zod schemas — LOCKED SPECIFICATION v1.0.0
 * Only VERIFIED concepts are loadable for production.
 */

import { z } from "zod";
import { confidenceLevelSchema } from "./intermediate";

export const conceptStatusSchema = z.enum([
  "DRAFT",
  "UNDER_REVIEW",
  "VERIFIED",
  "DEPRECATED",
  "BLOCKED",
]);

export const psychologicalConceptSchema = z
  .object({
    concept_id: z.string().min(1),
    name_en: z.string().min(1),
    name_vi: z.string().min(1),
    domain: z.string().min(1),
    subcategory: z.string().optional(),
    definition: z.string().min(1),
    mechanism: z.string().min(1),
    common_triggers: z.array(z.string()),
    associated_thoughts: z.array(z.string()),
    associated_emotions: z.array(z.string()),
    associated_behaviors: z.array(z.string()),
    maintaining_factors: z.array(z.string()),
    protective_factors: z.array(z.string()),
    related_concepts: z.array(z.string()),
    alternative_explanations: z.array(z.string()),
    misconceptions: z.array(z.string()),
    limitations: z.array(z.string()),
    evidence_strength: confidenceLevelSchema,
    clinical_or_nonclinical: z.enum(["nonclinical", "clinical_boundary", "clinical"]),
    when_not_to_infer: z.array(z.string()).min(1),
    sources: z.array(z.string()),
    status: conceptStatusSchema,
    version: z.string().min(1),
    last_reviewed: z.string().min(1),
  })
  .strict();

export const sourceSchema = z
  .object({
    source_id: z.string().min(1),
    title: z.string().min(1),
    authors: z.array(z.string()),
    year: z.number().int().positive(),
    source_type: z.enum([
      "systematic_review",
      "meta_analysis",
      "rct",
      "longitudinal",
      "guideline",
      "textbook",
      "other",
    ]),
    journal_or_organization: z.string().optional(),
    doi: z.string().optional(),
    population: z.string().optional(),
    country_or_region: z.string().optional(),
    limitations: z.array(z.string()),
    verification_status: z.enum(["VERIFIED", "UNVERIFIED", "FABRICATED_BLOCKED"]),
  })
  .strict();
