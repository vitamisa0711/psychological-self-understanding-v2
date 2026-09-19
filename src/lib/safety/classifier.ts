/**
 * Safety classifiers — PHASE 3
 * LOCKED SPECIFICATION v1.0.0
 *
 * RuleBasedSafetyClassifier is deterministic.
 * AISafetyClassifier is an interface stub for Phase 4 (no real provider).
 */

import { VERSIONS } from "@/lib/config/versions";
import { detectSafetyRules } from "./rules";
import type {
  SafetyClassifier,
  SafetyClassification,
  SafetyInput,
} from "./types";
import { safetyClassificationSchema } from "./schema";

export class RuleBasedSafetyClassifier implements SafetyClassifier {
  async classify(input: SafetyInput): Promise<SafetyClassification> {
    const { signals, riskLevel } = detectSafetyRules(input);

    const classification: SafetyClassification = {
      riskLevel,
      signals,
      confidence:
        signals.length === 0
          ? "MODERATE"
          : signals.some((s) => s.confidence === "HIGH")
            ? "HIGH"
            : "MODERATE",
      rationale: undefined, // do not store raw text
      classifierVersion: "rules_v1.0.0",
      safetyVersion: VERSIONS.safety,
    };

    // Validate own output
    const parsed = safetyClassificationSchema.safeParse(classification);
    if (!parsed.success) {
      return {
        riskLevel: "UNCERTAIN",
        signals: [],
        confidence: "INSUFFICIENT",
        classifierVersion: "rules_v1.0.0",
        safetyVersion: VERSIONS.safety,
      };
    }
    return parsed.data;
  }
}

/**
 * Placeholder AI classifier — Phase 4 will implement real provider.
 * Calling this without injection returns UNCERTAIN (fail-closed).
 */
export class UnimplementedAISafetyClassifier implements SafetyClassifier {
  async classify(_input: SafetyInput): Promise<SafetyClassification> {
    return {
      riskLevel: "UNCERTAIN",
      signals: [],
      confidence: "INSUFFICIENT",
      classifierVersion: "ai_unimplemented",
      safetyVersion: VERSIONS.safety,
    };
  }
}

/**
 * Validate external (e.g. AI) classification output.
 * Invalid → treat as UNCERTAIN.
 */
export function validateClassificationOutput(
  data: unknown
): SafetyClassification {
  const parsed = safetyClassificationSchema.safeParse(data);
  if (!parsed.success) {
    return {
      riskLevel: "UNCERTAIN",
      signals: [],
      confidence: "INSUFFICIENT",
      classifierVersion: "invalid_output",
      safetyVersion: VERSIONS.safety,
    };
  }
  return parsed.data;
}
