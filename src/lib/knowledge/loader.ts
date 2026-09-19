/**
 * Knowledge loader — PHASE 2
 * LOCKED SPECIFICATION v1.0.0
 *
 * - Reads concept JSON files
 * - Validates with Zod (.strict)
 * - Loads ONLY status === "VERIFIED"
 * - Never auto-promotes DRAFT/REVIEW/REJECTED
 * - Never invents evidence or sources
 * - Fails loud on invalid data
 */

import fs from "fs";
import path from "path";
import { knowledgeConceptSchema } from "./schema";
import type { KnowledgeConcept, KnowledgeBaseMeta } from "./types";
import { VERSIONS } from "@/lib/config/versions";

export class KnowledgeLoadError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "KnowledgeLoadError";
  }
}

export interface LoadResult {
  concepts: KnowledgeConcept[];
  meta: KnowledgeBaseMeta;
  rejected: Array<{ file: string; reason: string }>;
}

function defaultConceptsDir(): string {
  // Project root / knowledge/concepts
  return path.join(process.cwd(), "knowledge", "concepts");
}

/**
 * Validate a single concept object. Throws KnowledgeLoadError on failure.
 */
export function validateConcept(
  data: unknown,
  fileLabel?: string
): KnowledgeConcept {
  const parsed = knowledgeConceptSchema.safeParse(data);
  if (!parsed.success) {
    throw new KnowledgeLoadError(
      `Invalid concept schema${fileLabel ? ` in ${fileLabel}` : ""}`,
      fileLabel,
      parsed.error.flatten()
    );
  }
  return parsed.data as KnowledgeConcept;
}

/**
 * Load all VERIFIED concepts from a directory of JSON files.
 * Invalid files → fail loud (throw) unless options.softRejectInvalid is true
 * (used only for diagnostic tooling; production loader fails loud).
 */
export function loadVerifiedConcepts(
  conceptsDir: string = defaultConceptsDir(),
  options: { softRejectInvalid?: boolean } = {}
): LoadResult {
  if (!fs.existsSync(conceptsDir)) {
    throw new KnowledgeLoadError(
      `Concepts directory not found: ${conceptsDir}`,
      conceptsDir
    );
  }

  const files = fs
    .readdirSync(conceptsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const verified: KnowledgeConcept[] = [];
  const rejected: Array<{ file: string; reason: string }> = [];

  for (const file of files) {
    const fullPath = path.join(conceptsDir, file);
    let raw: string;
    try {
      raw = fs.readFileSync(fullPath, "utf-8");
    } catch (e) {
      throw new KnowledgeLoadError(`Cannot read ${fullPath}`, fullPath, e);
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      if (options.softRejectInvalid) {
        rejected.push({ file, reason: "malformed JSON" });
        continue;
      }
      throw new KnowledgeLoadError(`Malformed JSON in ${file}`, fullPath, e);
    }

    let concept: KnowledgeConcept;
    try {
      concept = validateConcept(data, file);
    } catch (e) {
      if (options.softRejectInvalid && e instanceof KnowledgeLoadError) {
        rejected.push({ file, reason: e.message });
        continue;
      }
      throw e;
    }

    // Absolute rule: only VERIFIED enters runtime KB
    if (concept.status !== "VERIFIED") {
      rejected.push({
        file,
        reason: `status=${concept.status} (not VERIFIED)`,
      });
      continue;
    }

    verified.push(concept);
  }

  // Broken related_concepts references among loaded set
  const ids = new Set(verified.map((c) => c.concept_id));
  for (const c of verified) {
    for (const rel of c.related_concepts) {
      if (!ids.has(rel)) {
        // related may point to concepts not yet in the set — warn via reject list
        // but do not fail load (related can be forward references). Documented limitation.
        rejected.push({
          file: c.concept_id,
          reason: `related_concepts references unknown id: ${rel} (forward ref allowed)`,
        });
      }
    }
  }

  const meta: KnowledgeBaseMeta = {
    knowledge_version: VERSIONS.knowledge,
    concept_count: verified.length,
    loaded_at: new Date().toISOString(),
  };

  return { concepts: verified, meta, rejected };
}

/**
 * Get a single verified concept by id from an already-loaded list.
 */
export function getConceptById(
  concepts: KnowledgeConcept[],
  conceptId: string
): KnowledgeConcept | undefined {
  return concepts.find((c) => c.concept_id === conceptId);
}
