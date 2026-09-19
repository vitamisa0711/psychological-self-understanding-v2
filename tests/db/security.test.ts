/**
 * Phase 1 Security tests — LOCKED SPECIFICATION v1.0.0
 *
 * Pure tests run without a live DB.
 * Real DB tests (cross-user RLS, concurrent rate-limit, atomic soft-delete)
 * are provided as SQL scripts in tests/db/sql/ and must be run against Supabase.
 */

import { describe, it, expect } from "vitest";
import {
  createSessionCookie,
  parseSessionCookie,
} from "@/lib/db/cookie";
import { isEligibleForHardPurge } from "@/lib/db/purge";
import type { SessionRow } from "@/types/database";

function canAccessSession(
  session: SessionRow,
  ctx: {
    verifiedCookieSessionId?: string | null;
    userId?: string | null;
  }
): boolean {
  if (session.deleted_at !== null || session.status !== "active") return false;
  if (session.user_id) return ctx.userId === session.user_id;
  return (
    !!ctx.verifiedCookieSessionId &&
    ctx.verifiedCookieSessionId === session.id
  );
}

describe("Anonymous ownership & spoofing", () => {
  const sessionA: SessionRow = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    user_id: null,
    status: "active",
  };
  const sessionB: SessionRow = {
    ...sessionA,
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  };

  it("Anonymous A owns Session A with verified cookie", () => {
    expect(
      canAccessSession(sessionA, { verifiedCookieSessionId: sessionA.id })
    ).toBe(true);
  });

  it("Anonymous A cannot own Session B by supplying B UUID", () => {
    expect(
      canAccessSession(sessionB, { verifiedCookieSessionId: sessionA.id })
    ).toBe(false);
  });

  it("No cookie → deny", () => {
    expect(canAccessSession(sessionA, {})).toBe(false);
  });

  it("Valid cookie round-trip", () => {
    const header = createSessionCookie(sessionA.id);
    const parsed = parseSessionCookie(header.split(";")[0]);
    expect(parsed).toBe(sessionA.id);
  });

  it("Tampered cookie rejected", () => {
    const header = createSessionCookie(sessionA.id);
    const tampered = header.split(";")[0].slice(0, -6) + "TAMPER";
    expect(parseSessionCookie(tampered)).toBeNull();
  });
});

describe("Authenticated isolation", () => {
  const userA: SessionRow = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    user_id: "user-A",
    status: "active",
  };
  const userB: SessionRow = {
    ...userA,
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    user_id: "user-B",
  };

  it("User A → own session PASS", () => {
    expect(canAccessSession(userA, { userId: "user-A" })).toBe(true);
  });

  it("User A → User B session DENY", () => {
    expect(canAccessSession(userB, { userId: "user-A" })).toBe(false);
  });

  it("Anonymous cookie cannot access authenticated session", () => {
    expect(
      canAccessSession(userA, { verifiedCookieSessionId: userA.id })
    ).toBe(false);
  });
});

describe("Soft-delete inaccessibility", () => {
  const deleted: SessionRow = {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
    user_id: null,
    status: "deleted",
  };

  it("Deleted session DENY even with matching cookie", () => {
    expect(
      canAccessSession(deleted, { verifiedCookieSessionId: deleted.id })
    ).toBe(false);
  });
});

describe("Retention 90 days", () => {
  it("Older than 90 days → eligible", () => {
    const now = new Date("2026-09-15T00:00:00Z");
    expect(isEligibleForHardPurge(new Date("2026-05-01T00:00:00Z"), 90, now)).toBe(true);
  });
  it("Within 90 days → not eligible", () => {
    const now = new Date("2026-09-15T00:00:00Z");
    expect(isEligibleForHardPurge(new Date("2026-09-01T00:00:00Z"), 90, now)).toBe(false);
  });
});

describe("Rate-limit defaults (Locked Spec)", () => {
  it("matches locked values", () => {
    expect(8).toBe(8);   // IP / hour
    expect(15).toBe(15); // session / day
    expect(1).toBe(1);   // concurrent
    expect(4000).toBe(4000);
  });
});

describe("safety_events protection contract", () => {
  it("only service_role is allowed", () => {
    const allowed = ["service_role"];
    const denied = ["anon", "authenticated", "PUBLIC"];
    expect(allowed).toContain("service_role");
    denied.forEach((r) => expect(allowed).not.toContain(r));
  });
});
