/**
 * Analysis persistence — PHASE 11
 * Only validated outputs. Service client for writes that need to bypass RLS edge cases.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SafetyLevel } from "@/lib/supabase/types";

export interface PersistAnalysisInput {
  sessionId: string;
  inputText: string;
  analysisJson: unknown | null;
  safetyLevel: SafetyLevel;
  status: "completed" | "safety_blocked" | "failed" | "safe_failure";
  requestId?: string;
  model?: string;
  versions?: {
    prompt?: string;
    knowledge?: string;
    reasoning?: string;
    safety?: string;
    schema?: string;
    model?: string;
    privacy_policy?: string;
  };
}

export async function persistAnalysis(
  client: SupabaseClient,
  input: PersistAnalysisInput
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await client
    .from("analyses")
    .insert({
      session_id: input.sessionId,
      input_text: input.inputText,
      analysis_json: input.analysisJson,
      safety_level: input.safetyLevel,
      status: input.status,
      request_id: input.requestId ?? null,
      model: input.model ?? null,
      prompt_version: input.versions?.prompt ?? null,
      knowledge_version: input.versions?.knowledge ?? null,
      reasoning_version: input.versions?.reasoning ?? null,
      safety_version: input.versions?.safety ?? null,
      schema_version: input.versions?.schema ?? null,
      model_version: input.versions?.model ?? null,
      privacy_policy_version: input.versions?.privacy_policy ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: "PERSISTENCE_ERROR" };
  return { id: data.id as string };
}
