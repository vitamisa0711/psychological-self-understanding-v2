import { describe, it, expect } from "vitest";
import {
  safetyInputSchema,
  safetyClassificationSchema,
  safetyDecisionSchema,
  safetyResponseSchema,
  safeFailureSchema,
} from "@/lib/safety/schema";

describe("Safety schemas", () => {
  it("TEST 28 — SafetyResponse validates", () => {
    const r = safetyResponseSchema.safeParse({
      type: "SAFETY_RESPONSE",
      riskLevel: "HIGH",
      message: "Thông báo an toàn.",
      version: "safety_v1.0.0",
    });
    expect(r.success).toBe(true);
  });

  it("TEST 29 — SafeFailure validates", () => {
    const r = safeFailureSchema.safeParse({
      type: "SAFE_FAILURE",
      riskLevel: "UNCERTAIN",
      message: "Không thể xử lý an toàn.",
      version: "safety_v1.0.0",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown fields (.strict)", () => {
    expect(
      safetyInputSchema.safeParse({
        text: "hello world enough chars",
        language: "vi",
        diagnosis: "x",
      }).success
    ).toBe(false);
  });

  it("invalid risk level fails", () => {
    expect(
      safetyClassificationSchema.safeParse({
        riskLevel: "EMERGENCY",
        signals: [],
        confidence: "HIGH",
        classifierVersion: "x",
        safetyVersion: "y",
      }).success
    ).toBe(false);
  });
});
