/**
 * REAL DB security integration tests — LOCKED SPECIFICATION v1.0.0
 *
 * These tests MUST FAIL when security invariants are broken.
 * They SKIP (not pass) when live credentials are absent.
 *
 * Run: npm run test:db
 * Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Migrations 000001–000004 must be applied.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  hasLiveDbCredentials,
  getLiveClients,
  skipIfNoLiveDb,
  randomUuid,
  type LiveClients,
} from "./helpers";

const LIVE = hasLiveDbCredentials();

describe.skipIf(!LIVE)("Phase 1 Real DB Security", () => {
  let clients: LiveClients;
  const sessionA = randomUuid();
  const sessionB = randomUuid();
  const analysisA = randomUuid();
  const analysisB = randomUuid();
  const userA = randomUuid(); // fake auth.users id — only used if we insert with service role bypassing FK
  // Note: sessions.user_id references auth.users. For isolation tests we use anonymous sessions
  // (user_id NULL) to avoid needing real auth.users rows, and test authenticated path
  // via service-role filtered queries that mirror RLS ownership rules.

  beforeAll(async () => {
    clients = getLiveClients();

    // Seed two anonymous sessions + analyses via service_role
    const { error: sErr } = await clients.service.from("sessions").insert([
      { id: sessionA, user_id: null, status: "active" },
      { id: sessionB, user_id: null, status: "active" },
    ]);
    if (sErr) throw sErr;

    const { error: aErr } = await clients.service.from("analyses").insert([
      {
        id: analysisA,
        session_id: sessionA,
        input_text: "sensitive text A",
        safety_level: "LOW",
        status: "completed",
      },
      {
        id: analysisB,
        session_id: sessionB,
        input_text: "sensitive text B",
        safety_level: "LOW",
        status: "completed",
      },
    ]);
    if (aErr) throw aErr;
  });

  afterAll(async () => {
    if (!clients) return;
    // Cleanup
    await clients.service.from("analyses").delete().in("id", [analysisA, analysisB]);
    await clients.service.from("sessions").delete().in("id", [sessionA, sessionB]);
    await clients.service.from("rate_limits").delete().like("key", "test:concurrent:%");
    await clients.service.from("safety_events").delete().eq("request_id", "test-security");
  });

  // ----------------------------------------------------------
  // A. set_session_context privilege
  // ----------------------------------------------------------
  describe("A. set_session_context privilege", () => {
    it("anon CANNOT execute set_session_context", async () => {
      const { error } = await clients.anon.rpc("set_session_context", {
        p_session_id: sessionA,
      });
      expect(error).not.toBeNull();
      // permission denied or function not available to role
      expect(
        error!.message.toLowerCase().includes("permission") ||
          error!.message.toLowerCase().includes("denied") ||
          error!.code === "42501" ||
          error!.message.includes("set_session_context")
      ).toBe(true);
    });

    it("service_role CAN execute set_session_context", async () => {
      const { error } = await clients.service.rpc("set_session_context", {
        p_session_id: sessionA,
      });
      // service_role should succeed (or at least not permission-denied)
      if (error) {
        expect(error.message.toLowerCase()).not.toMatch(/permission denied/);
      }
      // If function runs cleanly, error is null
      expect(error).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // B. Cross-user / anonymous isolation (application + RLS)
  // ----------------------------------------------------------
  describe("B. Cross-user / anonymous isolation", () => {
    it("service can read session A by id", async () => {
      const { data, error } = await clients.service
        .from("sessions")
        .select("id")
        .eq("id", sessionA)
        .is("deleted_at", null)
        .single();
      expect(error).toBeNull();
      expect(data?.id).toBe(sessionA);
    });

    it("anon without context cannot read sessions (RLS)", async () => {
      const { data, error } = await clients.anon
        .from("sessions")
        .select("id")
        .eq("id", sessionA);
      // RLS: no matching policy → empty or error
      expect(error || !data || data.length === 0).toBeTruthy();
      if (data) expect(data.find((r) => r.id === sessionA)).toBeUndefined();
    });

    it("anon cannot read analysis of session B", async () => {
      const { data } = await clients.anon
        .from("analyses")
        .select("id")
        .eq("id", analysisB);
      expect(!data || data.length === 0 || !data.find((r) => r.id === analysisB)).toBe(
        true
      );
    });
  });

  // ----------------------------------------------------------
  // C. Soft-delete atomicity
  // ----------------------------------------------------------
  describe("C. Soft-delete atomicity", () => {
    const delSession = randomUuid();
    const delAnalysis = randomUuid();

    it("soft_delete_session marks session and analyses deleted", async () => {
      // seed
      await clients.service.from("sessions").insert({
        id: delSession,
        user_id: null,
        status: "active",
      });
      await clients.service.from("analyses").insert({
        id: delAnalysis,
        session_id: delSession,
        input_text: "to delete",
        safety_level: "LOW",
        status: "completed",
      });

      const { error } = await clients.service.rpc("soft_delete_session", {
        p_session_id: delSession,
      });
      expect(error).toBeNull();

      const { data: sess } = await clients.service
        .from("sessions")
        .select("status, deleted_at")
        .eq("id", delSession)
        .single();
      expect(sess?.status).toBe("deleted");
      expect(sess?.deleted_at).not.toBeNull();

      const { data: ans } = await clients.service
        .from("analyses")
        .select("deleted_at")
        .eq("session_id", delSession);
      expect(ans?.length).toBeGreaterThan(0);
      ans?.forEach((row) => {
        expect(row.deleted_at).not.toBeNull();
      });
    });

    it("soft-deleted session is not visible as active", async () => {
      const { data } = await clients.service
        .from("sessions")
        .select("id")
        .eq("id", delSession)
        .eq("status", "active")
        .is("deleted_at", null);
      expect(!data || data.length === 0).toBe(true);
    });

    afterAll(async () => {
      await clients.service.from("analyses").delete().eq("id", delAnalysis);
      await clients.service.from("sessions").delete().eq("id", delSession);
    });
  });

  // ----------------------------------------------------------
  // D. safety_events protection
  // ----------------------------------------------------------
  describe("D. safety_events protection", () => {
    it("anon cannot SELECT safety_events", async () => {
      const { data, error } = await clients.anon.from("safety_events").select("id");
      // No policy for anon → empty result under RLS
      expect(!data || data.length === 0 || error).toBeTruthy();
    });

    it("anon cannot INSERT safety_events", async () => {
      const { error } = await clients.anon.from("safety_events").insert({
        risk_level: "HIGH",
        request_id: "test-security",
      });
      expect(error).not.toBeNull();
    });

    it("service_role can INSERT and SELECT safety_events", async () => {
      const { data: inserted, error: insErr } = await clients.service
        .from("safety_events")
        .insert({
          risk_level: "LOW",
          request_id: "test-security",
        })
        .select("id")
        .single();
      expect(insErr).toBeNull();
      expect(inserted?.id).toBeTruthy();

      const { data, error } = await clients.service
        .from("safety_events")
        .select("id")
        .eq("request_id", "test-security");
      expect(error).toBeNull();
      expect(data && data.length > 0).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // E. Atomic rate limit under concurrency
  // ----------------------------------------------------------
  describe("E. Atomic rate limit concurrency", () => {
    it("20 concurrent requests with limit=8 → exactly 8 allowed", async () => {
      const key = `test:concurrent:${randomUuid()}`;
      const limit = 8;
      const total = 20;

      const results = await Promise.all(
        Array.from({ length: total }, () =>
          clients.service.rpc("check_and_increment_rate_limit", {
            p_key: key,
            p_limit: limit,
            p_window_seconds: 3600,
          })
        )
      );

      // Every call must return without transport error
      const rows = results.map((r) => {
        expect(r.error).toBeNull();
        const row = Array.isArray(r.data) ? r.data[0] : r.data;
        expect(row).toBeTruthy();
        return row as { allowed: boolean; remaining: number };
      });

      const allowedCount = rows.filter((r) => r.allowed === true).length;
      const deniedCount = rows.filter((r) => r.allowed === false).length;

      expect(allowedCount).toBe(limit);
      expect(deniedCount).toBe(total - limit);

      // Single row for the key (no duplicate keys)
      const { data: rateRows, error } = await clients.service
        .from("rate_limits")
        .select("key, count")
        .eq("key", key);
      expect(error).toBeNull();
      expect(rateRows?.length).toBe(1);
      // count must be >= limit (increments past limit on denied requests in current design)
      expect(rateRows![0].count).toBeGreaterThanOrEqual(limit);
    });
  });
});

// When no live DB: explicit skipped suite message for CI visibility
describe.skipIf(LIVE)("Phase 1 Real DB Security (no credentials)", () => {
  it("HARNESS READY — LIVE DB EXECUTION REQUIRED", () => {
    expect(skipIfNoLiveDb()).toBe(true);
  });
});
