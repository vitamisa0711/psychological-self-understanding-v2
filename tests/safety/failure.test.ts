import { describe, it, expect } from "vitest";
import { classifySafety } from "@/lib/safety/orchestrator";
import { validateClassificationOutput } from "@/lib/safety/classifier";
import type { SafetyClassifier, SafetyInput } from "@/lib/safety/types";

const baseInput: SafetyInput = {
  text: "Hôm nay trời đẹp và tôi ổn.",
  language: "vi",
};

describe("Fail-closed paths", () => {
  it("TEST 17 — classifier timeout → UNCERTAIN", async () => {
    const slow: SafetyClassifier = {
      async classify() {
        await new Promise((r) => setTimeout(r, 100));
        return {
          riskLevel: "LOW",
          signals: [],
          confidence: "HIGH",
          classifierVersion: "slow",
          safetyVersion: "safety_v1.0.0",
        };
      },
    };
    const result = await classifySafety(baseInput, {
      aiClassifier: slow,
      timeoutMs: 10,
    });
    expect(result.decision.riskLevel).toBe("UNCERTAIN");
    expect(result.decision.shouldRunReasoning).toBe(false);
    expect(result.decision.action).toBe("SAFE_FAILURE");
  });

  it("TEST 18 — classifier exception → UNCERTAIN", async () => {
    const bad: SafetyClassifier = {
      async classify() {
        throw new Error("provider down");
      },
    };
    const result = await classifySafety(baseInput, { aiClassifier: bad, timeoutMs: 5000 });
    expect(result.decision.riskLevel).toBe("UNCERTAIN");
    expect(result.decision.shouldRunReasoning).toBe(false);
  });

  it("TEST 19 — invalid classifier schema → UNCERTAIN", () => {
    const c = validateClassificationOutput({ riskLevel: "NOPE", signals: [] });
    expect(c.riskLevel).toBe("UNCERTAIN");
  });

  it("TEST 20 — invalid risk level → UNCERTAIN", () => {
    const c = validateClassificationOutput({
      riskLevel: "EMERGENCY",
      signals: [],
      confidence: "HIGH",
      classifierVersion: "x",
      safetyVersion: "y",
    });
    expect(c.riskLevel).toBe("UNCERTAIN");
  });
});
