import { describe, it, expect } from "vitest";
import {
  riskLevelSchema,
  safetyClassificationSchema,
  safetyDecisionSchema,
} from "@/schemas/safety";
import { RiskLevel } from "@/types/safety";

describe("Safety schemas", () => {
  it("accepts all RiskLevel values including UNCERTAIN", () => {
    expect(riskLevelSchema.parse(RiskLevel.LOW)).toBe("LOW");
    expect(riskLevelSchema.parse(RiskLevel.UNCERTAIN)).toBe("UNCERTAIN");
    expect(riskLevelSchema.parse(RiskLevel.CRITICAL)).toBe("CRITICAL");
  });

  it("parses SafetyClassification with UNCERTAIN", () => {
    const result = safetyClassificationSchema.safeParse({
      riskLevel: RiskLevel.UNCERTAIN,
      signals: [],
      reasoning: "classifier timeout",
    });
    expect(result.success).toBe(true);
  });

  it("parses SAFE_FAILURE decision", () => {
    const result = safetyDecisionSchema.safeParse({
      action: "SAFE_FAILURE",
      riskLevel: RiskLevel.UNCERTAIN,
    });
    expect(result.success).toBe(true);
  });
});
