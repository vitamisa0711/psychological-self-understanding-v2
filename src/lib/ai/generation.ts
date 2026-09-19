/**
 * AI generation control — PHASE 8
 *
 * Deterministic expression of Phase 6 formulation (mock-safe).
 * Live LLM can plug in later via provider; output always validated.
 * MUST only run when Product Safety Gate ALLOW_REASONING.
 */

import { AI_CONTRACT_VERSION } from "./contract";
import { buildGenerationPrompt } from "./prompt-builder";
import { validateAIFormulation } from "./output-validator";
import type { AIFormulation } from "./output-schema";
import type { PsychologicalFormulation } from "@/lib/reasoning/types";
import type { ProductSafetyDecision } from "@/lib/pipeline/types";

export interface GenerationResult {
  status: "OK" | "BLOCKED" | "GENERATION_FAILED";
  formulation?: AIFormulation;
  reason?: string;
  contractVersion: string;
  promptMeta?: { contractVersion: string; modelId: string };
}

/**
 * Express reasoning as AIFormulation. No live model required.
 * Rejects if gate does not allow reasoning.
 */
export function generateFromFormulation(params: {
  userText: string;
  formulation: PsychologicalFormulation;
  safetyDecision: ProductSafetyDecision;
  modelId?: string;
}): GenerationResult {
  if (params.safetyDecision.action !== "ALLOW_REASONING") {
    return {
      status: "BLOCKED",
      reason: "SAFETY_GATE",
      contractVersion: AI_CONTRACT_VERSION,
    };
  }

  if (
    params.formulation.status === "SAFETY_GATED" ||
    params.formulation.status === "INSUFFICIENT_DATA"
  ) {
    const draft: AIFormulation = {
      status:
        params.formulation.status === "SAFETY_GATED"
          ? "SAFETY_STOP"
          : "INSUFFICIENT_DATA",
      uncertainty: params.formulation.uncertainty.missing,
      reflectiveQuestions: params.formulation.unresolved_questions,
      learningHistory: {
        evidencePresent: false,
        causalStatus: "UNKNOWN",
      },
    };
    const v = validateAIFormulation(draft, { childhoodEvidencePresent: false });
    if (!v.ok) {
      return {
        status: "GENERATION_FAILED",
        reason: v.reason,
        contractVersion: AI_CONTRACT_VERSION,
      };
    }
    return {
      status: "OK",
      formulation: v.value,
      contractVersion: AI_CONTRACT_VERSION,
    };
  }

  const prompt = buildGenerationPrompt({
    userText: params.userText,
    formulation: params.formulation,
    modelId: params.modelId,
  });

  // Deterministic natural-language mapping (not live LLM)
  const f = params.formulation;
  const draft: AIFormulation = {
    status: "OK",
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
    alternativeExplanations: f.hypotheses.flatMap((h) => h.alternative_explanations).slice(0, 6),
    uncertainty: [
      ...f.uncertainty.known.map((k) => `Đã biết: ${k}`),
      ...f.uncertainty.inferred.map((k) => `Suy luận: ${k}`),
      ...f.uncertainty.missing.map((k) => `Chưa rõ: ${k}`),
    ],
    reflectiveQuestions: f.unresolved_questions,
    knowledgeReferences: f.hypotheses
      .map((h) => h.concept_id)
      .filter((x): x is string => Boolean(x)),
  };

  const validated = validateAIFormulation(draft, {
    childhoodEvidencePresent: f.learning_history?.present ?? false,
  });

  if (!validated.ok) {
    return {
      status: "GENERATION_FAILED",
      reason: validated.reason,
      contractVersion: AI_CONTRACT_VERSION,
      promptMeta: {
        contractVersion: prompt.contractVersion,
        modelId: prompt.modelId,
      },
    };
  }

  return {
    status: "OK",
    formulation: validated.value,
    contractVersion: AI_CONTRACT_VERSION,
    promptMeta: {
      contractVersion: prompt.contractVersion,
      modelId: prompt.modelId,
    },
  };
}
