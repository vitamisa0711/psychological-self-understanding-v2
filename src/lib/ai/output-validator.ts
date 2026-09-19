/**
 * AI output validator — PHASE 8 enforcement layer
 */

import { aiFormulationSchema, type AIFormulation } from "./output-schema";
import { detectAllForbidden } from "./forbidden-language";
import { AI_VALIDATOR_VERSION } from "./contract";

export interface ValidationOk {
  ok: true;
  value: AIFormulation;
  validatorVersion: string;
}

export interface ValidationFail {
  ok: false;
  reason: string;
  violations?: string[];
  validatorVersion: string;
}

export type ValidationResult = ValidationOk | ValidationFail;

export function validateAIFormulation(
  raw: unknown,
  opts?: { childhoodEvidencePresent?: boolean }
): ValidationResult {
  const parsed = aiFormulationSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "SCHEMA_INVALID",
      violations: [parsed.error.message],
      validatorVersion: AI_VALIDATOR_VERSION,
    };
  }

  const value = parsed.data;
  const blob = JSON.stringify(value);
  const forbidden = detectAllForbidden(blob);
  if (!forbidden.ok) {
    return {
      ok: false,
      reason: "FORBIDDEN_LANGUAGE",
      violations: forbidden.violations,
      validatorVersion: AI_VALIDATOR_VERSION,
    };
  }

  // Childhood causal claims without evidence
  if (
    opts?.childhoodEvidencePresent === false &&
    value.learningHistory?.evidencePresent === true
  ) {
    return {
      ok: false,
      reason: "CHILDHOOD_EVIDENCE_MISMATCH",
      validatorVersion: AI_VALIDATOR_VERSION,
    };
  }

  if (value.hypotheses && value.hypotheses.length > 4) {
    return {
      ok: false,
      reason: "TOO_MANY_HYPOTHESES",
      validatorVersion: AI_VALIDATOR_VERSION,
    };
  }

  if (value.status === "OK" && value.hypotheses && value.hypotheses.length === 1) {
    // allow 1 only if clearly limited — property check soft
  }

  return {
    ok: true,
    value,
    validatorVersion: AI_VALIDATOR_VERSION,
  };
}
