/**
 * Public Analysis Output — LOCKED SPECIFICATION v1.0.0
 *
 * FORBIDDEN fields (must never appear):
 * recommendation, advice, next_steps, action_plan, diagnosis, prescription
 */

import { RiskLevel } from "./safety";
import {
  ExtractedFact,
  Interpretation,
  Emotion,
  AutomaticThought,
  Behavior,
  Trigger,
  PossibleNeed,
  MaintainingLoop,
  PastExperience,
  PsychologicalConceptMatch,
  Uncertainty,
} from "./intermediate";
import { Hypothesis } from "./hypothesis";

export interface AnalysisOutput {
  experience_summary: string;
  facts: ExtractedFact[];
  interpretations: Interpretation[];
  emotions: Emotion[];
  automatic_thoughts: AutomaticThought[];
  behaviors: Behavior[];
  triggers: Trigger[];
  possible_needs: PossibleNeed[];
  maintaining_patterns: MaintainingLoop[];
  past_experiences: PastExperience[];
  psychological_concepts: PsychologicalConceptMatch[];
  hypotheses: Hypothesis[];
  uncertainty: Uncertainty;
  reflective_questions: string[];
  versions: {
    prompt: string;
    knowledge: string;
    reasoning: string;
    safety: string;
    schema: string;
    model: string;
    privacy_policy: string;
  };
  safety_level: RiskLevel;
}
