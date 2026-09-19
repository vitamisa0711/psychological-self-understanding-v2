/**
 * Controlled generation entry — PHASE 9
 * Gate → prompt → provider → Phase 8 validation
 * AI never becomes safety/reasoning authority.
 */

import { AI_CONTRACT_VERSION } from "./contract";
import { buildGenerationPrompt } from "./prompt-builder";
import { validateAIFormulation } from "./output-validator";
import { createGenerationProvider, loadProviderConfigFromEnv } from "./provider-factory";
import type { GenerationAIProvider } from "./provider";
import type { PsychologicalFormulation } from "@/lib/reasoning/types";
import type { ProductSafetyDecision } from "@/lib/pipeline/types";
import type { AIFormulation } from "./output-schema";

const DEFAULT_MAX_INPUT = Number(process.env.MAX_INPUT_CHARS ?? 4000);

export interface ControlledGenerationResult {
  status: "OK" | "BLOCKED" | "GENERATION_FAILED";
  formulation?: AIFormulation;
  reason?: string;
  contractVersion: string;
  provider?: string;
  model?: string;
  callOrder: string[];
}

export interface ControlledGenerationDeps {
  provider?: GenerationAIProvider;
  maxInputChars?: number;
  timeoutMs?: number;
  maxOutputChars?: number;
}

/**
 * Only call after Product Safety Gate ALLOW_REASONING + Phase 6 formulation.
 */
export async function generateControlled(params: {
  userText: string;
  formulation: PsychologicalFormulation;
  safetyDecision: ProductSafetyDecision;
  deps?: ControlledGenerationDeps;
}): Promise<ControlledGenerationResult> {
  const callOrder: string[] = [];
  const config = loadProviderConfigFromEnv();

  if (params.safetyDecision.action !== "ALLOW_REASONING") {
    callOrder.push("blocked_safety_gate");
    return {
      status: "BLOCKED",
      reason: "SAFETY_GATE",
      contractVersion: AI_CONTRACT_VERSION,
      callOrder,
    };
  }

  const maxInput = params.deps?.maxInputChars ?? DEFAULT_MAX_INPUT;
  if (!params.userText || params.userText.length > maxInput) {
    callOrder.push("input_limit");
    return {
      status: "GENERATION_FAILED",
      reason: "INPUT_LIMIT",
      contractVersion: AI_CONTRACT_VERSION,
      callOrder,
    };
  }

  callOrder.push("prompt_build");
  const prompt = buildGenerationPrompt({
    userText: params.userText,
    formulation: params.formulation,
  });

  const provider =
    params.deps?.provider ?? createGenerationProvider(config);

  callOrder.push("provider");
  const outcome = await provider.generate({
    prompt,
    formulation: params.formulation,
    userText: params.userText,
    timeoutMs: params.deps?.timeoutMs ?? config.timeoutMs,
    maxOutputChars: params.deps?.maxOutputChars ?? config.maxOutputChars,
  });

  if (!outcome.ok) {
    callOrder.push("provider_error");
    return {
      status: "GENERATION_FAILED",
      reason: outcome.errorCategory,
      contractVersion: AI_CONTRACT_VERSION,
      provider: outcome.provider,
      callOrder,
    };
  }

  callOrder.push("validate");
  const validated = validateAIFormulation(outcome.raw, {
    childhoodEvidencePresent:
      params.formulation.learning_history?.present ?? false,
  });

  if (!validated.ok) {
    callOrder.push("validation_failed");
    return {
      status: "GENERATION_FAILED",
      reason: validated.reason,
      contractVersion: AI_CONTRACT_VERSION,
      provider: outcome.provider,
      model: outcome.model,
      callOrder,
    };
  }

  callOrder.push("ok");
  return {
    status: "OK",
    formulation: validated.value,
    contractVersion: AI_CONTRACT_VERSION,
    provider: outcome.provider,
    model: outcome.model,
    callOrder,
  };
}
