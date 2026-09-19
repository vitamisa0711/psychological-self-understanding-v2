/**
 * Reasoning Engine types — PHASE 6
 * LOCKED SPECIFICATION v1.0.0
 */

import type { SafetyEngineResult } from "@/lib/safety/types";
import type { KnowledgeConcept } from "@/lib/knowledge/types";
import type { EvidenceStrength } from "@/lib/knowledge/types";

export type FormulationStatus =
  | "VALID"
  | "INSUFFICIENT_DATA"
  | "SAFETY_GATED"
  | "UNCERTAIN";

export type FitLevel = "HIGH" | "MODERATE" | "LOW" | "UNCERTAIN";
export type ConfidenceLevel = "HIGH" | "MODERATE" | "LOW" | "UNCERTAIN";
export type ThoughtSource = "reported" | "inferred" | "uncertain";

export interface ReasoningInput {
  user_text: string;
  safety: SafetyEngineResult;
  context?: {
    previous_messages?: Array<{ role: string; content: string }>;
    session_summary?: string;
  };
  knowledge?: {
    concepts?: KnowledgeConcept[];
  };
  metadata?: {
    engine_version: string;
    prompt_version?: string;
    knowledge_version?: string;
  };
}

export interface Observation {
  id: string;
  text: string;
  kind: "user_stated" | "observable_from_text";
}

export interface InterpretationItem {
  id: string;
  text: string;
  source: "user_reported" | "inferred";
  confidence: ConfidenceLevel;
}

export interface EmotionObservation {
  id: string;
  label: string;
  confidence: ConfidenceLevel;
  source: "reported" | "inferred";
}

export interface ThoughtObservation {
  id: string;
  text: string;
  source: ThoughtSource;
}

export interface BehaviorObservation {
  id: string;
  text: string;
  source: "reported" | "inferred";
}

export interface TriggerObservation {
  id: string;
  text: string;
  confidence: ConfidenceLevel;
}

export interface NeedHypothesis {
  id: string;
  label: string;
  explanation: string;
  confidence: ConfidenceLevel;
}

export interface MaintainingLoop {
  id: string;
  steps: string[];
  explanation: string;
  confidence: ConfidenceLevel;
}

export interface LearningHistoryHypothesis {
  present: boolean;
  note: string;
}

export interface EvidenceItem {
  kind: "user" | "knowledge" | "inference" | "unknown";
  description: string;
  concept_id?: string;
  source_id?: string;
}

export interface KnowledgeReference {
  concept_id: string;
  name_vi: string;
  name_en: string;
  evidence_strength?: EvidenceStrength;
}

export interface PsychologicalHypothesis {
  hypothesis_id: string;
  concept_id?: string;
  label: string;
  formulation: string;
  supporting_evidence: EvidenceItem[];
  fit: { level: FitLevel; explanation: string };
  missing_data: string[];
  alternative_explanations: string[];
  contradictory_evidence: string[];
  confidence: { level: ConfidenceLevel; explanation: string };
  evidence_strength?: EvidenceStrength;
  knowledge_refs?: KnowledgeReference[];
}

export interface UncertaintyAssessment {
  known: string[];
  inferred: string[];
  missing: string[];
  why_missing_matters: string[];
}

export interface EvidenceTrace {
  hypothesis_id: string;
  concept_id?: string;
  source_ids: string[];
  status: "TRACED" | "INSUFFICIENT" | "UNSUPPORTED";
}

export interface PsychologicalFormulation {
  formulation_id: string;
  status: FormulationStatus;
  summary: string;
  observations: Observation[];
  event: { description: string };
  interpretation: InterpretationItem[];
  emotions: EmotionObservation[];
  automatic_thoughts: ThoughtObservation[];
  behaviors: BehaviorObservation[];
  triggers: TriggerObservation[];
  needs: NeedHypothesis[];
  maintaining_loops: MaintainingLoop[];
  learning_history?: LearningHistoryHypothesis;
  hypotheses: PsychologicalHypothesis[];
  unresolved_questions: string[];
  uncertainty: UncertaintyAssessment;
  evidence_trace: EvidenceTrace[];
  language_flags?: {
    advice_detected: boolean;
    diagnosis_detected: boolean;
    unsupported_certainty_detected: boolean;
  };
  engine_version: string;
  knowledge_version?: string;
}
