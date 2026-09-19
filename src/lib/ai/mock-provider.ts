/**
 * Mock generation provider — PHASE 9
 * Deterministic mapping from Phase 6 formulation → AIFormulation shape.
 * Used for tests, CI, local no-cost runs.
 */

import type {
  GenerationAIProvider,
  GenerationRequest,
  GenerationProviderOutcome,
} from "./provider";
import type { AIFormulation } from "./output-schema";

export class MockGenerationProvider implements GenerationAIProvider {
  readonly name = "mock";

  async generate(req: GenerationRequest): Promise<GenerationProviderOutcome> {
    const start = Date.now();
    const f = req.formulation;

    const draft: AIFormulation = {
      status:
        f.status === "SAFETY_GATED"
          ? "SAFETY_STOP"
          : f.status === "INSUFFICIENT_DATA"
            ? "INSUFFICIENT_DATA"
            : "OK",
      event: f.event.description,
      interpretation: f.interpretation.map((i) => i.text).join("; ") || undefined,
      emotions: f.emotions.map((e) => e.label),
      automaticThoughts: f.automatic_thoughts.map((t) => t.text),
      behaviors: f.behaviors.map((b) => b.text),
      triggers: f.triggers.map((t) => t.text),
      needs: f.needs.map((n) => n.label),
      maintainingLoop: f.maintaining_loops[0]
        ? f.maintaining_loops[0].steps.join(" → ")
        : undefined,
      learningHistory: {
        evidencePresent: f.learning_history?.present ?? false,
        description: f.learning_history?.note,
        causalStatus: "UNKNOWN",
      },
      hypotheses: f.hypotheses.slice(0, 4).map((h) => ({
        conceptId: h.concept_id,
        label: h.label,
        evidence: h.supporting_evidence.map((e) => e.description),
        fit: h.fit.explanation,
        missingData: h.missing_data,
        alternatives: h.alternative_explanations,
        confidence:
          h.confidence.level === "UNCERTAIN"
            ? "LOW"
            : (h.confidence.level as "LOW" | "MODERATE" | "HIGH"),
      })),
      alternativeExplanations: f.hypotheses
        .flatMap((h) => h.alternative_explanations)
        .slice(0, 6),
      uncertainty: [
        ...f.uncertainty.missing.map((k) => `Chưa rõ: ${k}`),
        ...f.uncertainty.inferred.map((k) => `Suy luận: ${k}`),
      ],
      reflectiveQuestions: f.unresolved_questions,
      knowledgeReferences: f.hypotheses
        .map((h) => h.concept_id)
        .filter((x): x is string => Boolean(x)),
    };

    return {
      ok: true,
      raw: draft,
      provider: this.name,
      model: "mock",
      durationMs: Date.now() - start,
    };
  }
}
