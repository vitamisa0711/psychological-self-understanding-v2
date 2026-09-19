import { describe, it, expect } from "vitest";
import { classifySafety } from "@/lib/safety/orchestrator";
import { RuleBasedSafetyClassifier } from "@/lib/safety/classifier";

describe("Safety classifier / orchestrator", () => {
  it("TEST 1 — LOW input → CONTINUE_REASONING", async () => {
    const r = await classifySafety({
      text: "Tôi hơi mệt sau một ngày dài nhưng vẫn ổn.",
      language: "vi",
    });
    expect(r.decision.riskLevel).toBe("LOW");
    expect(r.decision.shouldRunReasoning).toBe(true);
    expect(r.decision.action).toBe("CONTINUE_REASONING");
  });

  it("explicit suicide → no reasoning", async () => {
    const r = await classifySafety({
      text: "Tôi đang định tự sát.",
      language: "vi",
    });
    expect(["HIGH", "CRITICAL"]).toContain(r.decision.riskLevel);
    expect(r.decision.shouldRunReasoning).toBe(false);
    expect(r.decision.stopReasoning).toBe(true);
    expect(r.response?.type).toBe("SAFETY_RESPONSE");
  });

  it("RuleBasedSafetyClassifier returns valid structure", async () => {
    const c = new RuleBasedSafetyClassifier();
    const out = await c.classify({
      text: "Xin chào, hôm nay tôi vui.",
      language: "vi",
    });
    expect(out.safetyVersion).toBeTruthy();
    expect(out.classifierVersion).toBeTruthy();
    expect(["LOW", "MODERATE", "HIGH", "CRITICAL", "UNCERTAIN"]).toContain(
      out.riskLevel
    );
  });
});
