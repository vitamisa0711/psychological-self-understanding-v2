/**
 * Formulation output validators — PHASE 6
 */

import { psychologicalFormulationSchema } from "./schema";
import type { PsychologicalFormulation } from "./types";
import { fixViBoundary } from "@/lib/utils/regex";

// Wrapped with fixViBoundary: plain `\b` does not reliably match around
// Vietnamese letters with diacritics (see src/lib/utils/regex.ts) — without
// this, phrases like "Hãy thử." or "Bạn bị lo âu." at a sentence boundary
// were silently passing this safety validator undetected.
const ADVICE_RE = fixViBoundary(
  /\b(bạn\s+nên|bạn\s+cần|hãy\s+(thử|làm)|tốt\s+nhất\s+là|bạn\s+có\s+thể\s+thử|nên\s+chia\s+tay|nên\s+đi\s+trị\s+liệu|điều\s+bạn\s+cần\s+làm)\b/i
);

const DIAGNOSIS_RE = fixViBoundary(
  /\b(bạn\s+bị|bạn\s+mắc|bạn\s+có\s+rối\s+loạn|bạn\s+có\s+(PTSD|ADHD|bipolar)|chẩn\s+đoán)\b/i
);

const CERTAINTY_RE = fixViBoundary(
  /\b(chắc\s+chắn|rõ\s+ràng\s+bạn|đây\s+chính\s+là|nguyên\s+nhân\s+của\s+bạn\s+là|điều\s+này\s+chứng\s+minh)\b/i
);

export function detectAdvice(text: string): boolean {
  return ADVICE_RE.test(text);
}

export function detectDiagnosis(text: string): boolean {
  return DIAGNOSIS_RE.test(text);
}

export function detectUnsupportedCertainty(text: string): boolean {
  return CERTAINTY_RE.test(text);
}

export function auditFormulationText(f: PsychologicalFormulation): {
  advice_detected: boolean;
  diagnosis_detected: boolean;
  unsupported_certainty_detected: boolean;
} {
  const blob = JSON.stringify(f);
  return {
    advice_detected: detectAdvice(blob),
    diagnosis_detected: detectDiagnosis(blob),
    unsupported_certainty_detected: detectUnsupportedCertainty(blob),
  };
}

export function validateFormulation(
  data: unknown
): { ok: true; value: PsychologicalFormulation } | { ok: false; error: string } {
  const parsed = psychologicalFormulationSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }
  const flags = auditFormulationText(parsed.data as PsychologicalFormulation);
  if (flags.advice_detected || flags.diagnosis_detected) {
    return {
      ok: false,
      error: `Language policy violation: advice=${flags.advice_detected} diagnosis=${flags.diagnosis_detected}`,
    };
  }
  return {
    ok: true,
    value: {
      ...(parsed.data as PsychologicalFormulation),
      language_flags: flags,
    },
  };
}
