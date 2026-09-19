import { describe, it, expect } from "vitest";
import { isEligibleForHardPurge } from "@/lib/db/purge";
import { RETENTION_DAYS } from "@/lib/config/constants";

describe("isEligibleForHardPurge", () => {
  it("returns false for a session updated today", () => {
    const now = new Date();
    expect(isEligibleForHardPurge(now, RETENTION_DAYS, now)).toBe(false);
  });

  it("returns true for a session older than 90 days", () => {
    const now = new Date("2026-09-15T00:00:00Z");
    const old = new Date("2026-06-01T00:00:00Z"); // > 90 days earlier
    expect(isEligibleForHardPurge(old, 90, now)).toBe(true);
  });

  it("returns false for a session 89 days old", () => {
    const now = new Date("2026-09-15T00:00:00Z");
    const almost = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000);
    expect(isEligibleForHardPurge(almost, 90, now)).toBe(false);
  });

  it("uses default retention of 90 days", () => {
    expect(RETENTION_DAYS).toBe(90);
  });
});
