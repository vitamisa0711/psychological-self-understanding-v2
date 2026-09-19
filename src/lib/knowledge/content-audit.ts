/**
 * Knowledge Base content audits — PHASE 5
 * Detect advice language and diagnostic language in concept content.
 * Does not modify Safety Engine.
 */

import { fixViBoundaries } from "@/lib/utils/regex";

export interface AuditHit {
  field: string;
  match: string;
  snippet: string;
}

// Wrapped with fixViBoundaries: plain `\b` does not reliably match around
// Vietnamese letters with diacritics (see src/lib/utils/regex.ts).
const ADVICE_PATTERNS: RegExp[] = fixViBoundaries([
  /\bbạn\s+nên\b/i,
  /\bbạn\s+cần\b/i,
  /\bbạn\s+phải\b/i,
  /\bhãy\s+(thử|làm|nói|nghỉ|đi)\b/i,
  /\btốt\s+nhất\s+là\b/i,
  /\bbạn\s+có\s+thể\s+thử\b/i,
  /\bnên\s+làm\b/i,
  /\bđừng\s+(nên\s+)?(làm|nghĩ|nói)\b/i,
]);

const DIAGNOSTIC_PATTERNS: RegExp[] = fixViBoundaries([
  /\bbạn\s+bị\b/i,
  /\bbạn\s+mắc\b/i,
  /\bbạn\s+có\s+(rối\s+loạn|bệnh)\b/i,
  /\bđây\s+là\s+dấu\s+hiệu\s+chắc\s+chắn\b/i,
  /\bchẩn\s+đoán\s+là\b/i,
  /\byou\s+have\s+(PTSD|bipolar|schizophrenia|borderline)\b/i,
]);

function scanText(field: string, text: string, patterns: RegExp[]): AuditHit[] {
  const hits: AuditHit[] = [];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      hits.push({
        field,
        match: m[0],
        snippet: text.slice(Math.max(0, (m.index ?? 0) - 20), (m.index ?? 0) + 40),
      });
    }
  }
  return hits;
}

function collectStrings(value: unknown, prefix = ""): Array<{ field: string; text: string }> {
  if (typeof value === "string") return [{ field: prefix || "root", text: value }];
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => collectStrings(v, `${prefix}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      collectStrings(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [];
}

/** Scan a concept object for advice-style language. */
export function auditAdviceLanguage(concept: unknown): AuditHit[] {
  return collectStrings(concept).flatMap(({ field, text }) =>
    scanText(field, text, ADVICE_PATTERNS)
  );
}

/** Scan a concept object for diagnostic language. */
export function auditDiagnosticLanguage(concept: unknown): AuditHit[] {
  return collectStrings(concept).flatMap(({ field, text }) =>
    scanText(field, text, DIAGNOSTIC_PATTERNS)
  );
}

export function assertCleanConceptContent(concept: unknown, conceptId: string): void {
  const advice = auditAdviceLanguage(concept);
  const diagnostic = auditDiagnosticLanguage(concept);
  if (advice.length > 0) {
    throw new Error(
      `Advice language in ${conceptId}: ${advice.map((h) => h.match).join(", ")}`
    );
  }
  if (diagnostic.length > 0) {
    throw new Error(
      `Diagnostic language in ${conceptId}: ${diagnostic.map((h) => h.match).join(", ")}`
    );
  }
}
