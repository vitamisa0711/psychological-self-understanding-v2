/**
 * Safety Engine types — PHASE 3
 * LOCKED SPECIFICATION v1.0.0
 */

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNCERTAIN";

export type SafetyConfidence = "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT";

export type SignalSeverity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type SignalSource = "RULE" | "AI" | "BOTH";

export type SafetyCategory =
  | "SUICIDAL_IDEATION"
  | "SELF_HARM"
  | "IMMEDIATE_DANGER"
  | "VIOLENCE"
  | "ABUSE"
  | "DOMESTIC_VIOLENCE"
  | "SEXUAL_VIOLENCE"
  | "SEVERE_EATING_DISORDER_RISK"
  | "PSYCHOSIS_LIKE"
  | "MANIA_LIKE"
  | "MEDICAL_EMERGENCY"
  | "CHILD_SAFETY";

export interface SafetyInput {
  text: string;
  language: "vi";
  sessionId?: string;
}

export interface SafetySignal {
  signalId: string;
  category: SafetyCategory;
  severity: SignalSeverity;
  evidence: string[];
  confidence: "HIGH" | "MODERATE" | "LOW";
  source: SignalSource;
}

export interface SafetyClassification {
  riskLevel: RiskLevel;
  signals: SafetySignal[];
  confidence: SafetyConfidence;
  /** Internal only — do not log raw psychological content */
  rationale?: string;
  classifierVersion: string;
  safetyVersion: string;
}

export type SafetyAction =
  | "CONTINUE_REASONING"
  | "SAFETY_RESPONSE"
  | "SAFE_FAILURE";

export interface SafetyDecision {
  riskLevel: RiskLevel;
  action: SafetyAction;
  shouldRunReasoning: boolean;
  stopReasoning: boolean;
}

export interface SafetyResource {
  name: string;
  contact: string;
}

export interface SafetyResponse {
  type: "SAFETY_RESPONSE";
  riskLevel: "HIGH" | "CRITICAL";
  message: string;
  emergencyResources?: SafetyResource[];
  version: string;
}

export interface SafeFailure {
  type: "SAFE_FAILURE";
  riskLevel: "UNCERTAIN";
  message: string;
  version: string;
}

export interface SafetyClassifier {
  classify(input: SafetyInput): Promise<SafetyClassification>;
}

export interface SafetyEngineResult {
  classification: SafetyClassification;
  decision: SafetyDecision;
  response?: SafetyResponse;
  failure?: SafeFailure;
}
