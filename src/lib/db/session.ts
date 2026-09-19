/**
 * Session ownership & soft-delete helpers
 * LOCKED SPECIFICATION v1.0.0 — Phase 1 Security Fix
 *
 * Anonymous ownership authority = signed HttpOnly cookie (verified on server).
 * Client never supplies a raw UUID that becomes trusted ownership.
 * Soft-delete is atomic via PostgreSQL function.
 */

import { getAnonClient, getServiceClient } from "./client";
import { createId } from "@/lib/utils/id";
import type { SessionInsert, SessionRow } from "@/types/database";

/**
 * Create a new anonymous session.
 * Caller (server) must set the signed cookie via createSessionCookie(session.id).
 */
export async function createAnonymousSession(): Promise<SessionRow> {
  const client = getServiceClient();
  const id = createId();

  const { data, error } = await client
    .from("sessions")
    .insert({
      id,
      user_id: null,
      status: "active",
    } satisfies SessionInsert)
    .select()
    .single();

  if (error) throw error;
  return data as SessionRow;
}

/**
 * Create a session bound to an authenticated user.
 */
export async function createAuthenticatedSession(
  userId: string
): Promise<SessionRow> {
  const client = getServiceClient();
  const { data, error } = await client
    .from("sessions")
    .insert({
      user_id: userId,
      status: "active",
    } satisfies SessionInsert)
    .select()
    .single();

  if (error) throw error;
  return data as SessionRow;
}

/**
 * Load a session that the caller owns.
 *
 * For anonymous: server must already have verified the signed cookie
 * and established a trusted context (service role query filtered by id).
 * We never accept a client-supplied UUID as proof of ownership.
 */
export async function getOwnedSession(
  sessionId: string,
  options: {
    /** Verified from signed cookie — only pass after parseSessionCookie succeeded */
    verifiedAnonymousSessionId?: string;
    /** From auth.uid() */
    userId?: string | null;
  } = {}
): Promise<SessionRow | null> {
  const client = getServiceClient();

  // Anonymous path: only allow if the caller proved ownership via cookie
  if (options.verifiedAnonymousSessionId) {
    if (options.verifiedAnonymousSessionId !== sessionId) {
      return null; // spoof attempt
    }
    const { data, error } = await client
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .is("deleted_at", null)
      .eq("status", "active")
      .is("user_id", null)
      .maybeSingle();
    if (error) throw error;
    return (data as SessionRow) ?? null;
  }

  // Authenticated path
  if (options.userId) {
    const { data, error } = await client
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", options.userId)
      .is("deleted_at", null)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return (data as SessionRow) ?? null;
  }

  return null;
}

/**
 * Atomic soft-delete via PostgreSQL function.
 * Server must have already verified ownership before calling.
 */
export async function softDeleteSession(sessionId: string): Promise<void> {
  const client = getServiceClient();

  const { error } = await client.rpc("soft_delete_session", {
    p_session_id: sessionId,
  });

  if (error) throw error;
}
