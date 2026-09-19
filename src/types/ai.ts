/**
 * AI Provider abstraction — LOCKED SPECIFICATION v1.0.0
 * Business logic must not hard-code a single provider.
 */

import { PsychologicalInput } from "./input";
import { ReasoningResult } from "./intermediate";
import { SafetyInput, SafetyClassification } from "./safety";

export interface AIProviderConfig {
  model: string;
  timeoutMs: number;
  maxRetries: number;
  temperature?: number;
}

export interface AIProvider {
  /**
   * Safety classification must run before any reasoning.
   */
  classifySafety(input: SafetyInput): Promise<SafetyClassification>;

  /**
   * Full psychological reasoning (only called when safety allows).
   */
  analyze(input: PsychologicalInput): Promise<ReasoningResult>;
}
