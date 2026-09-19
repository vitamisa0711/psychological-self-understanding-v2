/**
 * Safety decision resolution — PHASE 3
 * LOCKED SPECIFICATION v1.0.0
 */

import { VERSIONS } from "@/lib/config/versions";
import type {
  RiskLevel,
  SafetyClassification,
  SafetyDecision,
  SafetyResponse,
  SafeFailure,
  SafetyEngineResult,
} from "./types";

/**
 * Map risk level to decision invariants.
 * No exceptions.
 */
export function resolveDecision(riskLevel: RiskLevel): SafetyDecision {
  switch (riskLevel) {
    case "LOW":
    case "MODERATE":
      return {
        riskLevel,
        action: "CONTINUE_REASONING",
        shouldRunReasoning: true,
        stopReasoning: false,
      };
    case "HIGH":
    case "CRITICAL":
      return {
        riskLevel,
        action: "SAFETY_RESPONSE",
        shouldRunReasoning: false,
        stopReasoning: true,
      };
    case "UNCERTAIN":
      return {
        riskLevel: "UNCERTAIN",
        action: "SAFE_FAILURE",
        shouldRunReasoning: false,
        stopReasoning: true,
      };
  }
}

/**
 * Neutral Safe Failure — never claims crisis when UNCERTAIN.
 */
export function buildSafeFailure(): SafeFailure {
  return {
    type: "SAFE_FAILURE",
    riskLevel: "UNCERTAIN",
    message:
      "Hiện tại hệ thống không thể xử lý yêu cầu này một cách an toàn. Vui lòng thử lại sau.",
    version: VERSIONS.safety,
  };
}

/**
 * Safety Response for HIGH/CRITICAL.
 * Does not invent hotlines. Resources only if verified list is provided.
 * No therapist role, no dependency language, no diagnosis.
 */
export function buildSafetyResponse(
  riskLevel: "HIGH" | "CRITICAL",
  resources?: Array<{ name: string; contact: string }>
): SafetyResponse {
  return {
    type: "SAFETY_RESPONSE",
    riskLevel,
    message:
      riskLevel === "CRITICAL"
        ? "Nội dung bạn chia sẻ cho thấy có thể đang có nguy cơ an toàn nghiêm trọng. Hệ thống không thể tiếp tục phân tích tâm lý trong tình huống này. Nếu bạn đang gặp nguy hiểm, hãy tìm sự hỗ trợ từ người tin cậy hoặc dịch vụ khẩn cấp tại địa phương."
        : "Nội dung bạn chia sẻ cho thấy có thể đang có nguy cơ an toàn cần được ưu tiên. Hệ thống không thể tiếp tục phân tích tâm lý thông thường trong tình huống này. Nếu bạn đang gặp khó khăn nghiêm trọng, hãy tìm sự hỗ trợ từ người tin cậy hoặc dịch vụ hỗ trợ phù hợp tại địa phương.",
    emergencyResources: resources && resources.length > 0 ? resources : undefined,
    version: VERSIONS.safety,
  };
}

export function buildEngineResult(
  classification: SafetyClassification
): SafetyEngineResult {
  const decision = resolveDecision(classification.riskLevel);
  const result: SafetyEngineResult = { classification, decision };

  if (decision.action === "SAFETY_RESPONSE") {
    result.response = buildSafetyResponse(
      classification.riskLevel as "HIGH" | "CRITICAL"
    );
  } else if (decision.action === "SAFE_FAILURE") {
    result.failure = buildSafeFailure();
  }

  return result;
}

/**
 * Conservative disagreement resolution.
 * Never downgrade HIGH/CRITICAL to LOW.
 * If unresolved conflict → UNCERTAIN.
 */
export function resolveDisagreement(
  ruleLevel: RiskLevel,
  aiLevel: RiskLevel
): RiskLevel {
  const rank: Record<RiskLevel, number> = {
    LOW: 0,
    MODERATE: 1,
    HIGH: 2,
    CRITICAL: 3,
    UNCERTAIN: -1,
  };

  if (ruleLevel === "UNCERTAIN" || aiLevel === "UNCERTAIN") {
    return "UNCERTAIN";
  }

  // Same band → keep
  if (ruleLevel === aiLevel) return ruleLevel;

  const r = rank[ruleLevel];
  const a = rank[aiLevel];

  // One side HIGH/CRITICAL and the other lower → cannot safely take lower
  if ((r >= 2 || a >= 2) && ruleLevel !== aiLevel) {
    // If both are elevated but different (HIGH vs CRITICAL) take higher
    if (r >= 2 && a >= 2) {
      return r >= a ? ruleLevel : aiLevel;
    }
    // Disagreement across safety boundary → UNCERTAIN (conservative, no downgrade)
    return "UNCERTAIN";
  }

  // Both LOW/MODERATE disagreement → take higher of the two
  return r >= a ? ruleLevel : aiLevel;
}
