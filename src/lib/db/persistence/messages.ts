import type { SupabaseClient } from "@supabase/supabase-js";

export async function persistMessage(
  client: SupabaseClient,
  input: {
    sessionId: string;
    role: "user" | "assistant" | "system";
    content: string;
    sequence?: number;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await client
    .from("messages")
    .insert({
      session_id: input.sessionId,
      role: input.role,
      content: input.content,
      sequence: input.sequence ?? 0,
    })
    .select("id")
    .single();

  if (error) return { error: "PERSISTENCE_ERROR" };
  return { id: data.id as string };
}
