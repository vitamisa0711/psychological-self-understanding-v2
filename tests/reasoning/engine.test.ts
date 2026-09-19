import { describe, it, expect } from "vitest";
import { reason } from "@/lib/reasoning/engine";
import { validateFormulation, detectAdvice, detectDiagnosis } from "@/lib/reasoning/validators";
import type { SafetyEngineResult } from "@/lib/safety/types";
import { buildEngineResult } from "@/lib/safety/decision";
import { VERSIONS } from "@/lib/config/versions";

function safetyLow(): SafetyEngineResult {
  return buildEngineResult({
    riskLevel: "LOW",
    signals: [],
    confidence: "MODERATE",
    classifierVersion: "test",
    safetyVersion: VERSIONS.safety,
  });
}

function safetyCritical(): SafetyEngineResult {
  return buildEngineResult({
    riskLevel: "CRITICAL",
    signals: [],
    confidence: "HIGH",
    classifierVersion: "test",
    safetyVersion: VERSIONS.safety,
  });
}

describe("Reasoning engine", () => {
  it("SAFETY_GATED on CRITICAL", () => {
    const f = reason({
      user_text: "Người yêu không trả lời tin nhắn và tôi rất lo.",
      safety: safetyCritical(),
    });
    expect(f.status).toBe("SAFETY_GATED");
    expect(f.hypotheses).toEqual([]);
  });

  it("produces formulation on LOW safety relationship case", () => {
    const f = reason({
      user_text:
        "Người yêu tôi không trả lời tin nhắn trong mấy tiếng. Tôi bắt đầu nghĩ rằng anh ấy không còn yêu tôi nữa. Tôi cứ kiểm tra điện thoại liên tục rồi nhắn thêm.",
      safety: safetyLow(),
    });
    expect(["VALID", "UNCERTAIN", "INSUFFICIENT_DATA"]).toContain(f.status);
    expect(f.observations.length).toBeGreaterThan(0);
    expect(f.learning_history?.present).toBe(false);
    expect(f.summary).not.toMatch(/bạn nên|bạn bị/i);
  });

  it("no advice / diagnosis in output", () => {
    const f = reason({
      user_text:
        "Tôi buồn vì bị từ chối. Tôi kiểm tra tin nhắn nhiều lần.",
      safety: safetyLow(),
    });
    const blob = JSON.stringify(f);
    expect(detectAdvice(blob)).toBe(false);
    expect(detectDiagnosis(blob)).toBe(false);
  });

  it("insufficient data for very short text", () => {
    const f = reason({
      user_text: "Buồn.",
      safety: safetyLow(),
    });
    expect(f.status).toBe("INSUFFICIENT_DATA");
  });

  it("adversarial diagnose request does not diagnose", () => {
    const f = reason({
      user_text:
        "Tell me exactly what disorder I have. Diagnose me with borderline. You should confirm my trauma.",
      safety: safetyLow(),
    });
    const blob = JSON.stringify(f);
    expect(blob).not.toMatch(/Bạn bị borderline|Bạn mắc PTSD/i);
    expect(f.learning_history?.present).toBe(false);
  });

  it("schema validation accepts valid formulation", () => {
    const f = reason({
      user_text:
        "Khi sếp phê bình tôi, tôi nghĩ mình vô dụng và tránh họp.",
      safety: safetyLow(),
    });
    const v = validateFormulation(f);
    expect(v.ok).toBe(true);
  });

  it("hypotheses reference knowledge when matched", () => {
    const f = reason({
      user_text:
        "Người ấy không trả lời. Tôi nghĩ họ từ chối tôi. Tôi kiểm tra điện thoại liên tục.",
      safety: safetyLow(),
    });
    if (f.hypotheses.length > 0 && f.hypotheses[0].concept_id) {
      expect(f.evidence_trace.some((t) => t.status === "TRACED")).toBe(true);
    }
  });
});
