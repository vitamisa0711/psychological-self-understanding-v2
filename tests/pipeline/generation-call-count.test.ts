import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildEngineResult } from "@/lib/safety/decision";
import { VERSIONS } from "@/lib/config/versions";
import type { SafetyEngineResult } from "@/lib/safety/types";
import type { PsychologicalFormulation } from "@/lib/reasoning/types";

// Runtime (not just static-source) verification of the Phase 13 invariant:
// generateControlled must be invoked exactly once for LOW/MODERATE and
// exactly zero times for HIGH/CRITICAL/UNCERTAIN, for every request through
// the pipeline's single public entry point (analyzeUserInput).
const generateControlledMock = vi.fn(async (_params: unknown) => ({
  status: "OK" as const,
  formulation: { summary: "ok" } as unknown,
  contractVersion: "test",
  callOrder: [],
}));

vi.mock("@/lib/ai/controlled-generation", () => ({
  generateControlled: (params: unknown) => generateControlledMock(params),
}));

// Import after the mock so the pipeline picks up the mocked module.
const { analyzeUserInput } = await import("@/lib/pipeline/product-safety-gate");

function engine(
  risk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNCERTAIN"
): SafetyEngineResult {
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

describe("Phase 13 — generateControlled call-count invariant", () => {
  beforeEach(() => {
    generateControlledMock.mockClear();
  });

  it("LOW → generateControlled called exactly once", async () => {
    await analyzeUserInput(
      { text: "Tôi hơi buồn hôm nay vì công việc." },
      { runSafety: async () => engine("LOW"), runReasoning: () => mockFormulation() }
    );
    expect(generateControlledMock).toHaveBeenCalledTimes(1);
  });

  it("MODERATE → generateControlled called exactly once", async () => {
    await analyzeUserInput(
      { text: "Tôi khá lo lắng về chuyện gia đình gần đây." },
      {
        runSafety: async () => engine("MODERATE"),
        runReasoning: () => mockFormulation(),
      }
    );
    expect(generateControlledMock).toHaveBeenCalledTimes(1);
  });

  it("HIGH → generateControlled never called", async () => {
    await analyzeUserInput(
      { text: "Tôi đang tự làm đau mình." },
      {
        runSafety: async () => engine("HIGH"),
        runReasoning: () => mockFormulation(),
      }
    );
    expect(generateControlledMock).not.toHaveBeenCalled();
  });

  it("CRITICAL → generateControlled never called", async () => {
    await analyzeUserInput(
      { text: "Tôi đang định tự sát." },
      {
        runSafety: async () => engine("CRITICAL"),
        runReasoning: () => mockFormulation(),
      }
    );
    expect(generateControlledMock).not.toHaveBeenCalled();
  });

  it("UNCERTAIN → generateControlled never called", async () => {
    await analyzeUserInput(
      { text: "nội dung mơ hồ đủ dài để không empty validation" },
      {
        runSafety: async () => engine("UNCERTAIN"),
        runReasoning: () => mockFormulation(),
      }
    );
    expect(generateControlledMock).not.toHaveBeenCalled();
  });

  it("VALIDATION_FAILURE (unsafe formulation) → generateControlled never called", async () => {
    const unsafe: PsychologicalFormulation = {
      ...mockFormulation(),
      summary: "Bạn nên chia tay và bạn bị rối loạn lo âu.",
    };
    await analyzeUserInput(
      { text: "Tôi buồn vì công việc." },
      { runSafety: async () => engine("LOW"), runReasoning: () => unsafe }
    );
    expect(generateControlledMock).not.toHaveBeenCalled();
  });
});
