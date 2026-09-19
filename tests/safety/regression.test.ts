import { describe, it, expect } from "vitest";
import { buildSafetyLogMetadata } from "@/lib/safety/logging";
import { classifySafety } from "@/lib/safety/orchestrator";

describe("Safety regression / privacy", () => {
  it("TEST 34 — log metadata has no raw text fields", () => {
    const meta = buildSafetyLogMetadata({
      riskLevel: "LOW",
      action: "CONTINUE_REASONING",
      classifierVersion: "rules_v1.0.0",
      safetyVersion: "safety_v1.0.0",
      sessionId: "11111111-1111-4111-8111-111111111111",
      signalCategories: ["SUICIDAL_IDEATION"],
    });
    expect(meta).not.toHaveProperty("text");
    expect(meta).not.toHaveProperty("input_text");
    expect(meta).not.toHaveProperty("analysis_json");
    expect(JSON.stringify(meta)).not.toMatch(/tôi đang/);
  });

  it("TEST 30 — no diagnosis in safety outputs", async () => {
    const r = await classifySafety({
      text: "Tôi đang định tự sát.",
      language: "vi",
    });
    const blob = JSON.stringify(r);
    expect(blob).not.toMatch(/Bạn bị PTSD|Bạn mắc bipolar|Bạn bị psychosis/i);
  });

  it("does not call reasoning (no reasoning import side effect)", async () => {
    // Phase 3 guarantee: orchestrator never imports reasoning
    const r = await classifySafety({
      text: "Tôi đang tự làm đau mình.",
      language: "vi",
    });
    expect(r.decision.shouldRunReasoning).toBe(false);
  });
});
