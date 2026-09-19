/**
 * Product Safety Gate contracts — PHASE 7
 * Maps to Phase 3/4 decisions; does not duplicate safety engine.
 */

import type { SafetyCategory, SafetyEngineResult } from "@/lib/safety/types";
import type { PsychologicalFormulation } from "@/lib/reasoning/types";
import type { AIFormulation } from "@/lib/ai/output-schema";
import type { SafetyResponse, SafeFailure } from "@/lib/safety/types";

export type ProductGateAction =
  | "ALLOW_REASONING"
  | "SAFETY_GATE"
  | "FAIL_CLOSED";

export type ProductGateStatus =
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "CRITICAL"
  | "UNCERTAIN";

export interface ProductSafetyDecision {
  status: ProductGateStatus;
  action: ProductGateAction;
  categories: SafetyCategory[];
  reason_code: string;
  version: string;
  shouldRunReasoning: boolean;
}

export interface AnalyzeRequest {
  /** Raw user text — only trusted input for safety */
  text: string;
  language?: "vi";
  sessionId?: string;
  /**
   * Client-supplied safety fields are IGNORED (forged override protection).
   * Kept optional only so tests can prove they are stripped.
   */
  safetyStatus?: string;
  allowReasoning?: boolean;
  safetyGate?: boolean;
}

export type AnalyzeResponseKind =
  | "FORMULATION"
  | "SAFETY_RESPONSE"
  | "SAFE_FAILURE"
  | "VALIDATION_FAILURE";

export interface AnalyzeResponse {
  kind: AnalyzeResponseKind;
  safety: ProductSafetyDecision;
  formulation?: PsychologicalFormulation;
  /** Phase 9 controlled generation output (single call in pipeline) */
  aiOutput?: AIFormulation | null;
  generationStatus?: string;
  safetyResponse?: SafetyResponse;
  safeFailure?: SafeFailure;
  callOrder: string[];
  engine_versions: {
    safety: string;
    reasoning?: string;
    knowledge?: string;
    generation?: string;
  };
}

export type SafetyRunner = (text: string, sessionId?: string) => Promise<SafetyEngineResult>;
export type ReasoningRunner = (args: {
  user_text: string;
  safety: SafetyEngineResult;
}) => PsychologicalFormulation;
