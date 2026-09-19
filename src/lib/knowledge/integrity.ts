/**
 * Knowledge Base integrity checks — PHASE 5
 */

import fs from "fs";
import path from "path";
import { knowledgeConceptSchema } from "./schema";
import { assertCleanConceptContent } from "./content-audit";
import type { KnowledgeConcept } from "./types";

export const KNOWLEDGE_BASE_VERSION = "knowledge_v1.0.0";

export interface IntegrityReport {
  knowledgeBaseVersion: string;
  totalFiles: number;
  verifiedCount: number;
  errors: string[];
  warnings: string[];
}

export function validateConceptIntegrity(
  data: unknown,
  fileLabel: string
): { concept?: KnowledgeConcept; errors: string[] } {
  const errors: string[] = [];
  const parsed = knowledgeConceptSchema.safeParse(data);
  if (!parsed.success) {
    errors.push(`${fileLabel}: schema invalid — ${parsed.error.message}`);
    return { errors };
  }
  const concept = parsed.data as KnowledgeConcept;

  try {
    assertCleanConceptContent(concept, concept.concept_id);
  } catch (e) {
    errors.push(`${fileLabel}: ${(e as Error).message}`);
  }

  if (!concept.when_not_to_infer?.length) {
    errors.push(`${fileLabel}: missing when_not_to_infer`);
  }
  if (!concept.alternative_explanations?.length) {
    errors.push(`${fileLabel}: missing alternative_explanations`);
  }
  if (!concept.limitations?.length) {
    errors.push(`${fileLabel}: missing limitations`);
  }
  if (!concept.sources?.length) {
    errors.push(`${fileLabel}: missing sources`);
  }

  const sourceIds = new Set(concept.sources.map((s) => s.source_id));
  for (const ev of concept.evidence) {
    for (const sid of ev.source_ids) {
      if (!sourceIds.has(sid)) {
        errors.push(`${fileLabel}: broken source ref ${sid}`);
      }
    }
  }

  return { concept, errors };
}

export function auditKnowledgeDirectory(
  conceptsDir: string = path.join(process.cwd(), "knowledge", "concepts")
): IntegrityReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  let verifiedCount = 0;
  let totalFiles = 0;

  if (!fs.existsSync(conceptsDir)) {
    return {
      knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
      totalFiles: 0,
      verifiedCount: 0,
      errors: [`Directory not found: ${conceptsDir}`],
      warnings: [],
    };
  }

  const files = fs.readdirSync(conceptsDir).filter((f) => f.endsWith(".json"));
  totalFiles = files.length;

  for (const file of files) {
    const full = path.join(conceptsDir, file);
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf-8"));
    } catch {
      errors.push(`${file}: malformed JSON`);
      continue;
    }

    const { concept, errors: errs } = validateConceptIntegrity(data, file);
    errors.push(...errs);
    if (!concept) continue;

    if (ids.has(concept.concept_id)) {
      errors.push(`${file}: duplicate concept_id ${concept.concept_id}`);
    }
    ids.add(concept.concept_id);

    if (concept.status === "VERIFIED") verifiedCount += 1;

    // Forward related_concepts may not exist yet
    for (const rel of concept.related_concepts) {
      if (!ids.has(rel) && concept.status === "VERIFIED") {
        // will re-check after full pass — store warning later
      }
    }
  }

  // Second pass related refs among verified
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(conceptsDir, file), "utf-8"));
    if (data.status !== "VERIFIED") continue;
    for (const rel of data.related_concepts || []) {
      if (!ids.has(rel)) {
        warnings.push(`${file}: related_concepts unknown id ${rel}`);
      }
    }
  }

  return {
    knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
    totalFiles,
    verifiedCount,
    errors,
    warnings,
  };
}
