import { describe, it, expect, vi } from "vitest";
import {
  analyzeUserInput,
  sanitizeAnalyzeRequest,
  toProductSafetyDecision,
} from "@/lib/pipeline/product-safety-gate";
import { buildEngineResult } from "@/lib/safety/decision";
import { VERSIONS } from "@/lib/config/versions";
import type { SafetyEngineResult } from "@/lib/safety/types";
import type { PsychologicalFormulation } from "@/lib/reasoning/types";

function engine(risk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNCERTAIN"): SafetyEngineResult {
  return buildEngineResult({
    riskLevel: risk,
    signals: [],
    confidence: risk === "UNCERTAIN" ? "INSUFFICIENT" : "HIGH",
    classifierVersion: "test",
    safetyVersion: VERSIONS.safety,
  });
}

function mockFormulation(): PsychologicalFormulation {
  return {
    formulation_id: "f1",
    status: "VALID",
    summary: "Formulation trung tính không advice không diagnosis.",
    observations: [],
    event: { description: "event" },
    interpretation: [],
    emotions: [],
    automatic_thoughts: [],
    behaviors: [],
    triggers: [],
    needs: [],
    maintaining_loops: [],
    learning_history: { present: false, note: "no childhood inference" },
    hypotheses: [],
    unresolved_questions: [],
    uncertainty: { known: [], inferred: [], missing: [], why_missing_matters: [] },
    evidence_trace: [],
    engine_version: "reasoning_v1.0.0",
    knowledge_version: VERSIONS.knowledge,
  };
}

describe("Product Safety Gate", () => {
  it("TEST A — ordinary sadness may allow reasoning", async () => {
    const res = await analyzeUserInput(
      { text: "Tôi buồn vì người yêu không trả lời tin nhắn." },
      {
        runSafety: async () => engine("LOW"),
        runReasoning: () => mockFormulation(),
      }
    );
    expect(res.safety.action).toBe("ALLOW_REASONING");
    expect(res.kind).toBe("FORMULATION");
    expect(res.callOrder.indexOf("safety")).toBeLessThan(
      res.callOrder.indexOf("reasoning")
    );
  });

  it("TEST B — HIGH gates reasoning", async () => {
    const reasoning = vi.fn(() => mockFormulation());
    const res = await analyzeUserInput(
      { text: "Tôi đang tự làm đau mình." },
      {
        runSafety: async () => engine("HIGH"),
        runReasoning: reasoning,
      }
    );
    expect(res.safety.status).toBe("HIGH");
    expect(res.safety.action).toBe("SAFETY_GATE");
    expect(reasoning).not.toHaveBeenCalled();
    expect(res.formulation).toBeUndefined();
    expect(res.callOrder).toContain("safety");
    expect(res.callOrder).not.toContain("reasoning");
  });

  it("TEST C — CRITICAL gates reasoning", async () => {
    const reasoning = vi.fn(() => mockFormulation());
    const res = await analyzeUserInput(
      { text: "Tôi đang định tự sát." },
      {
        runSafety: async () => engine("CRITICAL"),
        runReasoning: reasoning,
      }
    );
    expect(res.safety.status).toBe("CRITICAL");
    expect(res.safety.action).toBe("SAFETY_GATE");
    expect(reasoning).not.toHaveBeenCalled();
  });

  it("TEST D — UNCERTAIN fail-closed", async () => {
    const reasoning = vi.fn(() => mockFormulation());
    const res = await analyzeUserInput(
      { text: "ambiguous content here enough length" },
      {
        runSafety: async () => engine("UNCERTAIN"),
        runReasoning: reasoning,
      }
    );
    expect(res.safety.action).toBe("FAIL_CLOSED");
    expect(res.kind).toBe("SAFE_FAILURE");
    expect(reasoning).not.toHaveBeenCalled();
  });

  it("TEST I — client forged safety fields ignored", async () => {
    const runSafety = vi.fn(async () => engine("CRITICAL"));
    const res = await analyzeUserInput(
      {
        text: "Tôi đang định tự sát.",
        safetyStatus: "LOW",
        allowReasoning: true,
        safetyGate: false,
      },
      { runSafety, runReasoning: () => mockFormulation() }
    );
    expect(runSafety).toHaveBeenCalled();
    expect(res.safety.status).toBe("CRITICAL");
    expect(res.safety.action).toBe("SAFETY_GATE");
    expect(res.kind).not.toBe("FORMULATION");
  });

  it("TEST J — order safety before reasoning on LOW", async () => {
    const calls: string[] = [];
    await analyzeUserInput(
      { text: "Tôi hơi mệt sau một ngày dài." },
      {
        runSafety: async () => {
          calls.push("safety");
          return engine("LOW");
        },
        runReasoning: () => {
          calls.push("reasoning");
          return mockFormulation();
        },
      }
    );
    expect(calls.indexOf("safety")).toBeLessThan(calls.indexOf("reasoning"));
  });

  it("TEST J2 — HIGH never calls reasoning", async () => {
    const calls: string[] = [];
    await analyzeUserInput(
      { text: "high risk text long enough" },
      {
        runSafety: async () => {
          calls.push("safety");
          return engine("HIGH");
        },
        runReasoning: () => {
          calls.push("reasoning");
          return mockFormulation();
        },
      }
    );
    expect(calls).toEqual(["safety"]);
  });

  it("safety exception → UNCERTAIN fail-closed", async () => {
    const res = await analyzeUserInput(
      { text: "some normal length text for input" },
      {
        runSafety: async () => {
          throw new Error("boom");
        },
      }
    );
    expect(res.safety.status).toBe("UNCERTAIN");
    expect(res.safety.action).toBe("FAIL_CLOSED");
    expect(res.kind).toBe("SAFE_FAILURE");
  });

  it("sanitize strips client authority fields", () => {
    const s = sanitizeAnalyzeRequest({
      text: "hello",
      safetyStatus: "LOW",
      allowReasoning: true,
    });
    expect(s).toEqual({ text: "hello", language: "vi", sessionId: undefined });
    expect(s).not.toHaveProperty("safetyStatus");
  });

  it("toProductSafetyDecision maps HIGH → SAFETY_GATE", () => {
    const d = toProductSafetyDecision(engine("HIGH"));
    expect(d.action).toBe("SAFETY_GATE");
    expect(d.shouldRunReasoning).toBe(false);
  });

  it("TEST K — unsafe formulation not returned", async () => {
    const unsafe: PsychologicalFormulation = {
      ...mockFormulation(),
      summary: "Bạn nên chia tay và bạn bị rối loạn lo âu.",
    };
    const res = await analyzeUserInput(
      { text: "Tôi buồn vì công việc." },
      {
        runSafety: async () => engine("LOW"),
        runReasoning: () => unsafe,
      }
    );
    expect(res.kind).toBe("VALIDATION_FAILURE");
    expect(res.formulation).toBeUndefined();
  });
});
