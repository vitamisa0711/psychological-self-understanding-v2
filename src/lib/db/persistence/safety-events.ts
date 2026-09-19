/**
 * Privacy-safe safety event persistence — PHASE 11
 * No raw psychological text.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SafetyLevel } from "@/lib/supabase/types";

export async function persistSafetyEvent(
  client: SupabaseClient,
  input: {
    sessionId?: string;
    riskLevel: SafetyLevel;
    requestId?: string;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await client
    .from("safety_events")
    .insert({
      session_id: input.sessionId ?? null,
      risk_level: input.riskLevel,
      request_id: input.requestId ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: "PERSISTENCE_ERROR" };
  return { id: data.id as string };
}
