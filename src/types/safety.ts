/**
 * Safety Engine types — LOCKED SPECIFICATION v1.0.0
 *
 * RiskLevel includes UNCERTAIN.
 * Classifier failure → UNCERTAIN → Safe Failure (no crisis language).
 * HIGH / CRITICAL → Safety Response (crisis resources).
 */

export enum RiskLevel {
  LOW = "LOW",
  MODERATE = "MODERATE",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
  UNCERTAIN = "UNCERTAIN",
}

export type SafetyCategory =
  | "suicidal_ideation"
  | "self_harm"
  | "violence"
  | "abuse"
  | "psychosis_like"
  | "mania_like"
  | "eating_disorder"
  | "medical_emergency"
  | "child_safety"
  | "other";

export interface SafetyInput {
  text: string;
  sessionId?: string;
}

export interface SafetySignal {
  category: SafetyCategory;
  strength: number; // 0–1
  source: "rule" | "llm";
}

export interface SafetyClassification {
  riskLevel: RiskLevel;
  signals: SafetySignal[];
  reasoning: string; // internal only
  disagreement?: boolean;
}

export type SafetyAction = "ALLOW_ANALYSIS" | "SAFETY_RESPONSE" | "SAFE_FAILURE";

export interface SafetyDecision {
  action: SafetyAction;
  riskLevel: RiskLevel;
  responseTemplateId?: string;
}

export interface SafetyResponse {
  /** Crisis message — only for HIGH/CRITICAL */
  message: string;
  resources: Array<{ name: string; contact: string }>;
  allowContinueAnalysis: false;
}

export interface SafeFailureResponse {
  /** Neutral message — for UNCERTAIN / classifier failure */
  message: string;
  allowContinueAnalysis: false;
}
