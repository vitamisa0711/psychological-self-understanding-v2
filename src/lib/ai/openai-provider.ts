/**
 * OpenAI-compatible generation provider — PHASE 9
 * Server-side only. API key from env, never NEXT_PUBLIC_*.
 */

import type {
  GenerationAIProvider,
  GenerationRequest,
  GenerationProviderOutcome,
} from "./provider";

export interface OpenAIProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxRetries?: number;
}

export class OpenAIGenerationProvider implements GenerationAIProvider {
  readonly name = "openai";
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private maxRetries: number;

  constructor(opts: OpenAIProviderOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.baseUrl = opts.baseUrl ?? "https://api.openai.com/v1";
    this.maxRetries = opts.maxRetries ?? 1;
  }

  async generate(req: GenerationRequest): Promise<GenerationProviderOutcome> {
    if (!this.apiKey) {
      return {
        ok: false,
        errorCategory: "CONFIG",
        message: "AI_API_KEY missing",
        provider: this.name,
      };
    }

    const start = Date.now();
    let attempt = 0;
    let lastError: GenerationProviderOutcome | null = null;

    while (attempt <= this.maxRetries) {
      attempt += 1;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), req.timeoutMs);

        let response: Response;
        try {
          response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: this.model,
              temperature: 0.3,
              max_tokens: Math.min(2000, Math.ceil(req.maxOutputChars / 2)),
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: req.prompt.system },
                { role: "user", content: req.prompt.user },
              ],
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        if (response.status === 429) {
          lastError = {
            ok: false,
            errorCategory: "RATE_LIMIT",
            message: "provider rate limited",
            provider: this.name,
            statusCode: 429,
          };
          if (attempt <= this.maxRetries) continue;
          return lastError;
        }

        if (!response.ok) {
          return {
            ok: false,
            errorCategory: response.status >= 500 ? "HTTP_ERROR" : "PROVIDER_ERROR",
            message: `HTTP ${response.status}`,
            provider: this.name,
            statusCode: response.status,
          };
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (!content || typeof content !== "string") {
          return {
            ok: false,
            errorCategory: "INVALID_JSON",
            message: "empty model content",
            provider: this.name,
          };
        }

        if (content.length > req.maxOutputChars) {
          return {
            ok: false,
            errorCategory: "PROVIDER_ERROR",
            message: "output exceeds maxOutputChars",
            provider: this.name,
          };
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          return {
            ok: false,
            errorCategory: "INVALID_JSON",
            message: "malformed JSON from model",
            provider: this.name,
          };
        }

        return {
          ok: true,
          raw: parsed,
          provider: this.name,
          model: this.model,
          durationMs: Date.now() - start,
        };
      } catch (e) {
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" || e.message.includes("abort"));
        lastError = {
          ok: false,
          errorCategory: isAbort ? "TIMEOUT" : "NETWORK",
          message: isAbort ? "request timeout" : "network error",
          provider: this.name,
        };
        if (attempt <= this.maxRetries && !isAbort) continue;
        return lastError;
      }
    }

    return (
      lastError ?? {
        ok: false,
        errorCategory: "PROVIDER_ERROR",
        message: "unknown failure",
        provider: this.name,
      }
    );
  }
}
