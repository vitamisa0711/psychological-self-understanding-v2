/**
 * Database row types — LOCKED SPECIFICATION v1.0.0
 * Phase 1
 */

import { RiskLevel } from "./safety";

export type SessionStatus = "active" | "deleted";
export type AnalysisStatus =
  | "completed"
  | "safety_blocked"
  | "failed"
  | "safe_failure";

export interface SessionRow {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_id: string | null;
  status: SessionStatus;
}

export interface SessionInsert {
  id?: string;
  user_id?: string | null;
  status?: SessionStatus;
}

export interface AnalysisRow {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  input_text: string;
  analysis_json: unknown | null;
  safety_level: RiskLevel;
  model: string | null;
  prompt_version: string | null;
  knowledge_version: string | null;
  reasoning_version: string | null;
  safety_version: string | null;
  schema_version: string | null;
  model_version: string | null;
  privacy_policy_version: string | null;
  status: AnalysisStatus;
  request_id: string | null;
}

export interface AnalysisInsert {
  session_id: string;
  input_text: string;
  analysis_json?: unknown | null;
  safety_level: RiskLevel;
  model?: string | null;
  prompt_version?: string | null;
  knowledge_version?: string | null;
  reasoning_version?: string | null;
  safety_version?: string | null;
  schema_version?: string | null;
  model_version?: string | null;
  privacy_policy_version?: string | null;
  status: AnalysisStatus;
  request_id?: string | null;
}

export interface FeedbackRow {
  id: string;
  analysis_id: string;
  created_at: string;
  helpful: boolean;
  reason: string | null;
}

export interface FeedbackInsert {
  analysis_id: string;
  helpful: boolean;
  reason?: string | null;
}

export interface SafetyEventRow {
  id: string;
  session_id: string | null;
  created_at: string;
  risk_level: RiskLevel;
  request_id: string | null;
}

export interface SafetyEventInsert {
  session_id?: string | null;
  risk_level: RiskLevel;
  request_id?: string | null;
}

export interface RateLimitRow {
  key: string;
  count: number;
  window_start: string;
  updated_at: string;
}
