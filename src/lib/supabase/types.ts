/**
 * Minimal DB row types — PHASE 11
 * Align with migrations; JSON validated before cast to domain types.
 */

export type SafetyLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNCERTAIN";

export interface SessionRow {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_id: string | null;
  status: "active" | "deleted";
}

export interface MessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sequence: number;
  created_at: string;
  deleted_at: string | null;
}

export interface AnalysisRow {
  id: string;
  session_id: string;
  created_at: string;
  input_text: string;
  analysis_json: unknown | null;
  safety_level: SafetyLevel;
  status: string;
  request_id: string | null;
}

export interface SafetyEventRow {
  id: string;
  session_id: string | null;
  created_at: string;
  risk_level: SafetyLevel;
  request_id: string | null;
}

export interface ModelRunRow {
  id: string;
  analysis_id: string | null;
  session_id: string | null;
  provider: string;
  model_id: string | null;
  status: "ok" | "failed" | "blocked" | "timeout";
  latency_ms: number | null;
  error_code: string | null;
  created_at: string;
}
