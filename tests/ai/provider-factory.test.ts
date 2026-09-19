import { describe, it, expect } from "vitest";
import { createGenerationProvider } from "@/lib/ai/provider-factory";
import { OpenAIGenerationProvider } from "@/lib/ai/openai-provider";
import { MockGenerationProvider } from "@/lib/ai/mock-provider";
import type { ProviderFactoryConfig } from "@/lib/ai/provider";

// Phase 14 requirement: production must never silently fall back to the mock
// AI provider. These tests exercise createGenerationProvider directly (not
// just static source inspection) to prove the fail-loud behavior actually
// throws where it must, and still works normally in non-production / with
// correct configuration.

function cfg(overrides: Partial<ProviderFactoryConfig>): ProviderFactoryConfig {
  return {
    provider: "mock",
    apiKey: undefined,
    model: "gpt-4o-mini",
    timeoutMs: 45_000,
    maxRetries: 1,
    maxOutputChars: 8000,
    isProduction: false,
    ...overrides,
  };
}

describe("Phase 14 — production AI provider fail-loud invariant", () => {
  it("production + provider resolved to mock (AI_PROVIDER missing/invalid) → throws", () => {
    expect(() =>
      createGenerationProvider(cfg({ provider: "mock", isProduction: true }))
    ).toThrow(/must never run in production|resolved to 'mock'/i);
  });

  it("production + provider=openai + no API key → throws", () => {
    expect(() =>
      createGenerationProvider(
        cfg({ provider: "openai", apiKey: undefined, isProduction: true })
      )
    ).toThrow(/AI_API_KEY required/i);
  });

  it("production + provider=anthropic (unimplemented) → throws even with an API key", () => {
    expect(() =>
      createGenerationProvider(
        cfg({ provider: "anthropic", apiKey: "sk-fake", isProduction: true })
      )
    ).toThrow(/no real provider implementation|must not be used in production/i);
  });

  it("production + provider=openai + real API key → returns a real OpenAI provider, no throw", () => {
    const provider = createGenerationProvider(
      cfg({ provider: "openai", apiKey: "sk-fake-but-present", isProduction: true })
    );
    expect(provider).toBeInstanceOf(OpenAIGenerationProvider);
  });

  it("non-production + provider=mock → returns mock, no throw (dev/test only)", () => {
    const provider = createGenerationProvider(cfg({ provider: "mock", isProduction: false }));
    expect(provider).toBeInstanceOf(MockGenerationProvider);
  });

  it("non-production + provider=openai + no key → falls back to mock (dev convenience only)", () => {
    const provider = createGenerationProvider(
      cfg({ provider: "openai", apiKey: undefined, isProduction: false })
    );
    expect(provider).toBeInstanceOf(MockGenerationProvider);
  });
});
