import type { SupabaseClient } from "@supabase/supabase-js";

export async function persistModelRun(
  client: SupabaseClient,
  input: {
    analysisId?: string;
    sessionId?: string;
    provider: string;
    modelId?: string;
    status: "ok" | "failed" | "blocked" | "timeout";
    latencyMs?: number;
    errorCode?: string;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await client
    .from("model_runs")
    .insert({
      analysis_id: input.analysisId ?? null,
      session_id: input.sessionId ?? null,
      provider: input.provider,
      model_id: input.modelId ?? null,
      status: input.status,
      latency_ms: input.latencyMs ?? null,
      error_code: input.errorCode ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: "PERSISTENCE_ERROR" };
  return { id: data.id as string };
}
