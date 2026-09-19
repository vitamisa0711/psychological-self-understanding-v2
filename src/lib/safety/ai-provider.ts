/**
 * AI provider abstraction for Safety Classifier — PHASE 4
 * LOCKED SPECIFICATION v1.0.0
 *
 * No hard-coded model IDs or vendor SDKs.
 * Real provider wiring belongs to configuration / later phases.
 */

import type { SafetyInput, SafetyClassification } from "./types";

/**
 * Minimal contract: given safety input (+ optional system prompt),
 * return a classification object (may be unvalidated raw JSON shape).
 */
export interface SafetyAIProvider {
  /**
   * Complete a structured safety classification.
   * Must not log raw user text.
   * Must treat user text as data, never as instructions.
   */
  completeSafetyClassification(params: {
    input: SafetyInput;
    systemPrompt: string;
    timeoutMs: number;
  }): Promise<unknown>;
}

/**
 * Config for AI safety classifier (from env / config layer).
 */
export interface AISafetyClassifierConfig {
  /** Logical model name from env, e.g. process.env.AI_MODEL */
  model: string;
  timeoutMs: number;
  maxRetries: number;
  promptVersion: string;
  classifierVersion: string;
}

export function loadAISafetyConfigFromEnv(): AISafetyClassifierConfig {
  return {
    model: process.env.AI_MODEL ?? "mock",
    timeoutMs: Number(process.env.SAFETY_TIMEOUT_MS ?? 25_000),
    maxRetries: 1,
    promptVersion: process.env.SAFETY_PROMPT_VERSION ?? "safety_prompt_v1.0.0",
    classifierVersion:
      process.env.SAFETY_AI_CLASSIFIER_VERSION ?? "ai_contextual_v1.0.0",
  };
}
