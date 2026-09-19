/**
 * Conversation Memory — PHASE 15 / V2
 *
 * Loads and saves ConversationMemory and ConversationTurns using the
 * existing `messages` table (Phase 11 schema + Phase 15 migration columns).
 *
 * Privacy: conversation_meta does NOT store raw user text beyond what
 * the messages.content column already holds. It only stores structural
 * metadata (signal lists, hypothesis labels, question strings).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationTurn, ConversationMemory, ConversationState } from "./types";
import { emptyMemory } from "./types";

// ─── Load ─────────────────────────────────────────────────────────────────

export async function loadConversationHistory(
  client: SupabaseClient,
  sessionId: string
): Promise<{ turns: ConversationTurn[]; memory: ConversationMemory; currentState: ConversationState }> {
  const { data, error } = await client
    .from("messages")
    .select("id, role, content, sequence, conversation_state, conversation_meta")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("sequence", { ascending: true });

  if (error || !data || data.length === 0) {
    return { turns: [], memory: emptyMemory(), currentState: "VENTING" };
  }

  const turns: ConversationTurn[] = data.map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content,
    sequence: row.sequence,
    state: (row.conversation_state as ConversationState) ?? undefined,
    meta: row.conversation_meta ?? undefined,
  }));

  // The latest assistant turn carries the most recent memory snapshot
  const lastAssistantTurn = [...turns]
    .reverse()
    .find((t) => t.role === "assistant" && t.meta);

  const memory: ConversationMemory = lastAssistantTurn?.meta
    ? { ...emptyMemory(), ...(lastAssistantTurn.meta as Partial<ConversationMemory>) }
    : emptyMemory();

  const currentState: ConversationState =
    (lastAssistantTurn?.state) ?? "VENTING";

  return { turns, memory, currentState };
}

// ─── Save ──────────────────────────────────────────────────────────────────

export async function saveConversationTurn(
  client: SupabaseClient,
  params: {
    sessionId: string;
    role: "user" | "assistant";
    content: string;
    sequence: number;
    state?: ConversationState;
    memory?: Partial<ConversationMemory>;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await client
    .from("messages")
    .insert({
      session_id: params.sessionId,
      role: params.role,
      content: params.content,
      sequence: params.sequence,
      conversation_state: params.state ?? null,
      conversation_meta: params.memory ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: "PERSISTENCE_ERROR" };
  return { id: data.id as string };
}
