import { describe, it, expect } from "vitest";
import type { SessionRow } from "@/types/database";

/**
 * Ownership rules after Phase 1 Security Fix.
 * Authority for anonymous = verified signed cookie only.
 */

function isOwner(
  session: SessionRow,
  ctx: {
    verifiedCookieSessionId?: string | null;
    userId?: string | null;
  }
): boolean {
  if (session.deleted_at !== null || session.status !== "active") return false;

  if (session.user_id) {
    return ctx.userId === session.user_id;
  }
  return (
    !!ctx.verifiedCookieSessionId &&
    ctx.verifiedCookieSessionId === session.id
  );
}

describe("Ownership model (post security fix)", () => {
  const activeAnonymous: SessionRow = {
    id: "11111111-1111-4111-8111-111111111111",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    user_id: null,
    status: "active",
  };

  const activeAuth: SessionRow = {
    ...activeAnonymous,
    id: "22222222-2222-4222-8222-222222222222",
    user_id: "user-aaa",
  };

  const softDeleted: SessionRow = {
    ...activeAnonymous,
    id: "33333333-3333-4333-8333-333333333333",
    status: "deleted",
    deleted_at: new Date().toISOString(),
  };

  it("anonymous owner matches verified cookie session id", () => {
    expect(
      isOwner(activeAnonymous, {
        verifiedCookieSessionId: activeAnonymous.id,
      })
    ).toBe(true);
  });

  it("anonymous owner is denied when cookie proves a different session", () => {
    expect(
      isOwner(activeAnonymous, {
        verifiedCookieSessionId: "99999999-9999-4999-8999-999999999999",
      })
    ).toBe(false);
  });

  it("raw UUID without verified cookie is denied", () => {
    expect(isOwner(activeAnonymous, {})).toBe(false);
  });

  it("authenticated owner matches auth.uid()", () => {
    expect(isOwner(activeAuth, { userId: "user-aaa" })).toBe(true);
  });

  it("authenticated owner is denied for different user", () => {
    expect(isOwner(activeAuth, { userId: "user-bbb" })).toBe(false);
  });

  it("soft-deleted session is inaccessible", () => {
    expect(
      isOwner(softDeleted, { verifiedCookieSessionId: softDeleted.id })
    ).toBe(false);
  });

  it("does not auto-merge anonymous into authenticated", () => {
    expect(isOwner(activeAnonymous, { userId: "user-aaa" })).toBe(false);
  });
});
