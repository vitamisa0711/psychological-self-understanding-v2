/**
 * Generation AI Provider abstraction — PHASE 9
 * Model generates natural language from structured reasoning only.
 * Does NOT decide safety, knowledge validity, or product policy.
 */

import type { PsychologicalFormulation } from "@/lib/reasoning/types";
import type { AIFormulation } from "./output-schema";
import type { BuiltPrompt } from "./prompt-builder";

export interface GenerationRequest {
  prompt: BuiltPrompt;
  formulation: PsychologicalFormulation;
  userText: string;
  /** Max chars of user text already enforced by caller */
  timeoutMs: number;
  maxOutputChars: number;
}

export interface GenerationProviderResult {
  ok: true;
  raw: unknown;
  provider: string;
  model: string;
  durationMs: number;
}

export interface GenerationProviderError {
  ok: false;
  errorCategory:
    | "TIMEOUT"
    | "HTTP_ERROR"
    | "RATE_LIMIT"
    | "NETWORK"
    | "INVALID_JSON"
    | "PROVIDER_ERROR"
    | "CONFIG";
  message: string;
  provider: string;
  statusCode?: number;
}

export type GenerationProviderOutcome =
  | GenerationProviderResult
  | GenerationProviderError;

export interface GenerationAIProvider {
  readonly name: string;
  generate(req: GenerationRequest): Promise<GenerationProviderOutcome>;
}

export interface ProviderFactoryConfig {
  provider: "mock" | "openai" | "anthropic";
  apiKey?: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  maxOutputChars: number;
  /** When true, production requires real key if provider is not mock */
  isProduction: boolean;
}
