import { describe, it, expect, vi } from "vitest";
import { MockGenerationProvider } from "@/lib/ai/mock-provider";
import { OpenAIGenerationProvider } from "@/lib/ai/openai-provider";
import { generateControlled } from "@/lib/ai/controlled-generation";
import { buildGenerationPrompt } from "@/lib/ai/prompt-builder";
import type { PsychologicalFormulation } from "@/lib/reasoning/types";
import type { ProductSafetyDecision } from "@/lib/pipeline/types";
import type { GenerationAIProvider, GenerationRequest } from "@/lib/ai/provider";

const allow: ProductSafetyDecision = {
  status: "LOW",
  action: "ALLOW_REASONING",
  categories: [],
  reason_code: "allow_low",
  version: "product_safety_gate_v1.0.0",
  shouldRunReasoning: true,
};

const blocked: ProductSafetyDecision = {
  status: "CRITICAL",
  action: "SAFETY_GATE",
  categories: [],
  reason_code: "gate_critical",
  version: "product_safety_gate_v1.0.0",
  shouldRunReasoning: false,
};

function form(): PsychologicalFormulation {
  return {
    formulation_id: "f1",
    status: "VALID",
    summary: "Tóm tắt trung tính.",
    observations: [],
    event: { description: "Không nhận phản hồi." },
    interpretation: [],
    emotions: [],
    automatic_thoughts: [],
    behaviors: [],
    triggers: [],
    needs: [],
    maintaining_loops: [],
    learning_history: { present: false, note: "no childhood" },
    hypotheses: [
      {
        hypothesis_id: "h1",
        concept_id: "rejection-sensitivity",
        label: "Nhạy cảm với sự từ chối",
        formulation: "Có điểm tương đồng với rejection sensitivity.",
        supporting_evidence: [{ kind: "user", description: "diễn giải im lặng" }],
        fit: { level: "MODERATE", explanation: "vừa" },
        missing_data: ["tần suất"],
        alternative_explanations: ["stress"],
        contradictory_evidence: [],
        confidence: { level: "LOW", explanation: "ít data" },
      },
    ],
    unresolved_questions: ["Có pattern ở quan hệ khác?"],
    uncertainty: { known: [], inferred: [], missing: ["context"], why_missing_matters: [] },
    evidence_trace: [],
    engine_version: "reasoning_v1.0.0",
  };
}

describe("Phase 9 providers", () => {
  it("mock provider returns structured raw", async () => {
    const p = new MockGenerationProvider();
    const prompt = buildGenerationPrompt({ userText: "text đủ dài", formulation: form() });
    const out = await p.generate({
      prompt,
      formulation: form(),
      userText: "text đủ dài",
      timeoutMs: 5000,
      maxOutputChars: 8000,
    });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.provider).toBe("mock");
  });

  it("HIGH/CRITICAL → provider not called", async () => {
    const spy: GenerationAIProvider = {
      name: "spy",
      generate: vi.fn(async () => ({
        ok: true as const,
        raw: { status: "OK" },
        provider: "spy",
        model: "x",
        durationMs: 1,
      })),
    };
    const r = await generateControlled({
      userText: "Tôi đang định tự sát và có kế hoạch.",
      formulation: form(),
      safetyDecision: blocked,
      deps: { provider: spy },
    });
    expect(r.status).toBe("BLOCKED");
    expect(spy.generate).not.toHaveBeenCalled();
  });

  it("LOW → provider then validate", async () => {
    const r = await generateControlled({
      userText: "Tôi buồn vì người yêu không trả lời tin nhắn.",
      formulation: form(),
      safetyDecision: allow,
      deps: { provider: new MockGenerationProvider() },
    });
    expect(r.status).toBe("OK");
    expect(r.callOrder.indexOf("provider")).toBeLessThan(
      r.callOrder.indexOf("validate")
    );
  });

  it("invalid JSON from provider → GENERATION_FAILED", async () => {
    const bad: GenerationAIProvider = {
      name: "bad",
      async generate() {
        return {
          ok: false,
          errorCategory: "INVALID_JSON",
          message: "malformed",
          provider: "bad",
        };
      },
    };
    const r = await generateControlled({
      userText: "normal length text here for generation",
      formulation: form(),
      safetyDecision: allow,
      deps: { provider: bad },
    });
    expect(r.status).toBe("GENERATION_FAILED");
    expect(r.reason).toBe("INVALID_JSON");
  });

  it("advice in provider output → validation reject", async () => {
    const evil: GenerationAIProvider = {
      name: "evil",
      async generate() {
        return {
          ok: true,
          raw: {
            status: "OK",
            event: "x",
            interpretation: "Bạn nên chia tay ngay lập tức.",
          },
          provider: "evil",
          model: "x",
          durationMs: 1,
        };
      },
    };
    const r = await generateControlled({
      userText: "normal length relationship worry text",
      formulation: form(),
      safetyDecision: allow,
      deps: { provider: evil },
    });
    expect(r.status).toBe("GENERATION_FAILED");
    expect(r.reason).toBe("FORBIDDEN_LANGUAGE");
  });

  it("OpenAI provider timeout maps to TIMEOUT", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = vi.fn(
      () =>
        new Promise((_, reject) => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        })
    ) as unknown as typeof fetch;

    const p = new OpenAIGenerationProvider({
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      maxRetries: 0,
    });
    const prompt = buildGenerationPrompt({
      userText: "hello world enough",
      formulation: form(),
    });
    const out = await p.generate({
      prompt,
      formulation: form(),
      userText: "hello world enough",
      timeoutMs: 50,
      maxOutputChars: 1000,
    });
    globalThis.fetch = original;
    expect(out.ok).toBe(false);
    if (!out.ok) expect(["TIMEOUT", "NETWORK"]).toContain(out.errorCategory);
  });

  it("input over limit fails", async () => {
    const r = await generateControlled({
      userText: "x".repeat(5000),
      formulation: form(),
      safetyDecision: allow,
      deps: { maxInputChars: 100, provider: new MockGenerationProvider() },
    });
    expect(r.status).toBe("GENERATION_FAILED");
    expect(r.reason).toBe("INPUT_LIMIT");
  });
});
