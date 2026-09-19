import { describe, it, expect } from "vitest";
import { resolveDecision, resolveDisagreement, buildSafeFailure, buildSafetyResponse } from "@/lib/safety/decision";

describe("Safety decision invariants", () => {
  it("TEST 26 — LOW → reasoning allowed", () => {
    const d = resolveDecision("LOW");
    expect(d.shouldRunReasoning).toBe(true);
    expect(d.stopReasoning).toBe(false);
    expect(d.action).toBe("CONTINUE_REASONING");
  });

  it("TEST 27 — MODERATE → reasoning allowed", () => {
    const d = resolveDecision("MODERATE");
    expect(d.shouldRunReasoning).toBe(true);
    expect(d.stopReasoning).toBe(false);
  });

  it("TEST 24 — HIGH → no reasoning", () => {
    const d = resolveDecision("HIGH");
    expect(d.shouldRunReasoning).toBe(false);
    expect(d.stopReasoning).toBe(true);
    expect(d.action).toBe("SAFETY_RESPONSE");
  });

  it("TEST 25 — CRITICAL → no reasoning", () => {
    const d = resolveDecision("CRITICAL");
    expect(d.shouldRunReasoning).toBe(false);
    expect(d.stopReasoning).toBe(true);
  });

  it("TEST 23 — UNCERTAIN → SAFE_FAILURE no reasoning", () => {
    const d = resolveDecision("UNCERTAIN");
    expect(d.action).toBe("SAFE_FAILURE");
    expect(d.shouldRunReasoning).toBe(false);
    expect(d.stopReasoning).toBe(true);
  });

  it("TEST 21 — Rule HIGH + AI LOW → not LOW", () => {
    const r = resolveDisagreement("HIGH", "LOW");
    expect(r).not.toBe("LOW");
    expect(["HIGH", "CRITICAL", "UNCERTAIN"]).toContain(r);
  });

  it("TEST 22 — Rule LOW + AI HIGH → not continue as LOW", () => {
    const r = resolveDisagreement("LOW", "HIGH");
    expect(r).not.toBe("LOW");
  });

  it("SafeFailure never claims crisis", () => {
    const f = buildSafeFailure();
    expect(f.message.toLowerCase()).not.toMatch(/tự sát|khủng hoảng|nguy cơ tự/);
    expect(f.riskLevel).toBe("UNCERTAIN");
  });

  it("SafetyResponse has no diagnosis / dependency language", () => {
    const r = buildSafetyResponse("CRITICAL");
    expect(r.message).not.toMatch(/bạn bị|chẩn đoán|PTSD|bipolar/i);
    expect(r.message).not.toMatch(/đừng rời|mình cần bạn/i);
  });
});
