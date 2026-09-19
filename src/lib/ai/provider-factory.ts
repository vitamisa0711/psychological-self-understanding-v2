/**
 * Server-side provider factory — PHASE 9
 * Client cannot select provider or bypass safety.
 */

import type { GenerationAIProvider, ProviderFactoryConfig } from "./provider";
import { MockGenerationProvider } from "./mock-provider";
import { OpenAIGenerationProvider } from "./openai-provider";

export function loadProviderConfigFromEnv(): ProviderFactoryConfig {
  const providerRaw = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  const provider =
    providerRaw === "openai" || providerRaw === "anthropic" ? providerRaw : "mock";

  return {
    provider,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? process.env.REASONING_TIMEOUT_MS ?? 45_000),
    maxRetries: Number(process.env.AI_MAX_RETRIES ?? 1),
    maxOutputChars: Number(process.env.AI_MAX_OUTPUT_CHARS ?? 8000),
    isProduction: process.env.NODE_ENV === "production",
  };
}

/**
 * Resolve generation provider.
 * Production must use a real, correctly configured provider — never a
 * silent mock fallback (Phase 14 requirement). "mock" only runs outside
 * production (local dev / tests).
 */
export function createGenerationProvider(
  config: ProviderFactoryConfig = loadProviderConfigFromEnv()
): GenerationAIProvider {
  if (config.provider === "mock") {
    if (config.isProduction) {
      throw new Error(
        "AI_PROVIDER is missing or invalid in production (resolved to 'mock'). " +
          "Set AI_PROVIDER=openai and AI_API_KEY in the production environment " +
          "— the mock provider must never run in production."
      );
    }
    return new MockGenerationProvider();
  }

  if (config.provider === "openai") {
    if (!config.apiKey) {
      if (config.isProduction) {
        throw new Error("AI_API_KEY required for openai provider in production");
      }
      // Dev without key: fail-safe to mock only when explicitly not production
      // Spec: do not silently fallback in production. Dev: return mock with name note.
      return new MockGenerationProvider();
    }
    return new OpenAIGenerationProvider({
      apiKey: config.apiKey,
      model: config.model,
      maxRetries: config.maxRetries,
    });
  }

  // anthropic: no AnthropicGenerationProvider implementation exists yet.
  // Never allow this to silently serve mock output as if it were real
  // generation in production — fail loudly regardless of API key presence.
  if (config.provider === "anthropic") {
    if (config.isProduction) {
      throw new Error(
        "AI_PROVIDER=anthropic has no real provider implementation " +
          "(AnthropicGenerationProvider does not exist yet) and must not be " +
          "used in production. Use AI_PROVIDER=openai."
      );
    }
    return new MockGenerationProvider();
  }

  return new MockGenerationProvider();
}
