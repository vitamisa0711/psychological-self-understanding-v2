/**
 * Public AnalysisOutput Zod schema — LOCKED SPECIFICATION v1.0.0
 * .strict() forbids any extra fields (advice, diagnosis, etc.)
 */

import { z } from "zod";
import {
  extractedFactSchema,
  interpretationSchema,
  emotionSchema,
  automaticThoughtSchema,
  behaviorSchema,
  triggerSchema,
  possibleNeedSchema,
  maintainingLoopSchema,
  pastExperienceSchema,
  psychologicalConceptMatchSchema,
  uncertaintySchema,
} from "./intermediate";
import { hypothesisSchema } from "./hypothesis";
import { riskLevelSchema } from "./safety";

export const versionsSchema = z
  .object({
    prompt: z.string().min(1),
    knowledge: z.string().min(1),
    reasoning: z.string().min(1),
    safety: z.string().min(1),
    schema: z.string().min(1),
    model: z.string().min(1),
    privacy_policy: z.string().min(1),
  })
  .strict();

export const analysisOutputSchema = z
  .object({
    experience_summary: z.string().min(1).max(2000),
    facts: z.array(extractedFactSchema),
    interpretations: z.array(interpretationSchema),
    emotions: z.array(emotionSchema),
    automatic_thoughts: z.array(automaticThoughtSchema),
    behaviors: z.array(behaviorSchema),
    triggers: z.array(triggerSchema),
    possible_needs: z.array(possibleNeedSchema),
    maintaining_patterns: z.array(maintainingLoopSchema),
    past_experiences: z.array(pastExperienceSchema),
    psychological_concepts: z.array(psychologicalConceptMatchSchema),
    hypotheses: z.array(hypothesisSchema).min(1).max(4),
    uncertainty: uncertaintySchema,
    reflective_questions: z.array(z.string().max(500)),
    versions: versionsSchema,
    safety_level: riskLevelSchema,
  })
  .strict();

export type AnalysisOutputSchema = z.infer<typeof analysisOutputSchema>;
