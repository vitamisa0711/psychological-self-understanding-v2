/**
 * Intermediate Representation for Reasoning Engine
 * LOCKED SPECIFICATION v1.0.0
 *
 * All AI-derived content MUST carry InformationType correctly.
 * Never assign USER_FACT to AI-generated content.
 */

import { ConfidenceLevel, InformationType } from "./information";

export interface ExtractedFact {
  id: string;
  text: string;
  type: InformationType.USER_FACT;
  sourceSpan?: string;
  confidence: ConfidenceLevel;
}

export interface Interpretation {
  id: string;
  text: string;
  type: InformationType.USER_INTERPRETATION;
  relatedFactIds: string[];
  confidence: ConfidenceLevel;
}

export interface Emotion {
  id: string;
  label: string; // Vietnamese
  intensity?: "low" | "medium" | "high";
  type: InformationType.USER_FACT | InformationType.AI_INFERENCE;
  evidence: string[];
  confidence: ConfidenceLevel;
}

export interface AutomaticThought {
  id: string;
  text: string;
  type: InformationType;
  relatedEmotionIds?: string[];
  confidence: ConfidenceLevel;
}

export interface Behavior {
  id: string;
  text: string;
  type: InformationType.USER_FACT | InformationType.AI_INFERENCE;
  evidence: string[];
  confidence: ConfidenceLevel;
}

export interface Trigger {
  id: string;
  text: string;
  type: InformationType;
  confidence: ConfidenceLevel;
}

export interface PossibleNeed {
  id: string;
  label: string;
  type: InformationType.AI_INFERENCE | InformationType.HYPOTHESIS;
  confidence: ConfidenceLevel;
  evidence: string[];
}

export interface MaintainingLoop {
  id: string;
  description: string;
  steps: string[]; // Trigger → Interpretation → Emotion → Behavior → Consequence
  confidence: ConfidenceLevel;
  evidence: string[];
}

export interface PastExperience {
  id: string;
  text: string;
  /** Only USER_FACT if user explicitly stated it. Never invent childhood. */
  type: InformationType;
  confidence: ConfidenceLevel;
}

export interface PsychologicalConceptMatch {
  conceptId: string;
  nameVi: string;
  nameEn: string;
  similarityScore: number; // 0–1
  matchedFeatures: string[];
  confidence: ConfidenceLevel;
  whenNotToInferTriggered: boolean;
}

export interface Uncertainty {
  overall: ConfidenceLevel;
  missingInformation: string[];
  openQuestions: string[];
}

export interface ReasoningResult {
  input: import("./input").PsychologicalInput;
  facts: ExtractedFact[];
  interpretations: Interpretation[];
  emotions: Emotion[];
  automaticThoughts: AutomaticThought[];
  behaviors: Behavior[];
  triggers: Trigger[];
  possibleNeeds: PossibleNeed[];
  maintainingLoops: MaintainingLoop[];
  pastExperiences: PastExperience[];
  conceptMatches: PsychologicalConceptMatch[];
  hypotheses: import("./hypothesis").Hypothesis[];
  uncertainty: Uncertainty;
  reflectiveQuestions: string[];
  versions: {
    prompt: string;
    knowledge: string;
    reasoning: string;
    safety: string;
    schema: string;
    model: string;
    privacy_policy: string;
  };
}
