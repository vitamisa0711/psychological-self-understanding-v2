/**
 * Hypothesis Model — LOCKED SPECIFICATION v1.0.0
 * Supports 2–4 hypotheses when data is ambiguous.
 */

import { ConfidenceLevel } from "./information";

export interface EvidenceReference {
  type: "user_text" | "knowledge_claim";
  reference: string;
  strength: ConfidenceLevel;
}

export interface Hypothesis {
  id: string;
  conceptId?: string;
  title: string; // short Vietnamese
  explanation: string;
  supportingEvidence: EvidenceReference[];
  missingEvidence: string[];
  contradictoryEvidence: string[];
  alternativeExplanations: string[];
  confidence: ConfidenceLevel;
  whenNotToInfer: string[];
  clinicalBoundaryNote?: string; // e.g. "Không phải chẩn đoán"
}
