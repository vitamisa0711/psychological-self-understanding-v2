/**
 * Product Safety Gate — PHASE 7
 *
 * Server-side authority. Client safety fields are ignored.
 * Order: validate → safety → gate → (optional) reasoning → validate output.
 * Does not rewrite Phase 3–6 engines.
 */

import { VERSIONS } from "@/lib/config/versions";
import { classifySafety } from "@/lib/safety/orchestrator";
import { AIContextualSafetyClassifier } from "@/lib/safety/ai-contextual-classifier";
import { reason } from "@/lib/reasoning/engine";
import { generateControlled } from "@/lib/ai/controlled-generation";
import { validateFormulation } from "@/lib/reasoning/validators";
import { buildSafetyLogMetadata } from "@/lib/safety/logging";
import type { SafetyEngineResult } from "@/lib/safety/types";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ProductSafetyDecision,
  ProductGateAction,
  ProductGateStatus,
  SafetyRunner,
  ReasoningRunner,
} from "./types";

const PRODUCT_SAFETY_CONTRACT_VERSION = "product_safety_gate_v1.0.0";

/** Map Phase 3/4 engine result → product gate decision */
export function toProductSafetyDecision(
  engine: SafetyEngineResult
): ProductSafetyDecision {
  const risk = engine.decision.riskLevel as ProductGateStatus;
  let action: ProductGateAction;
  let reason_code: string;

  if (risk === "HIGH" || risk === "CRITICAL") {
    action = "SAFETY_GATE";
    reason_code = `gate_${risk.toLowerCase()}`;
  } else if (risk === "UNCERTAIN") {
    action = "FAIL_CLOSED";
    reason_code = "fail_closed_uncertain";
  } else if (
    (risk === "LOW" || risk === "MODERATE") &&
    engine.decision.shouldRunReasoning
  ) {
    action = "ALLOW_REASONING";
    reason_code = `allow_${risk.toLowerCase()}`;
  } else {
    action = "FAIL_CLOSED";
    reason_code = "fail_closed_unexpected";
  }

  const categories = engine.classification.signals.map((s) => s.category);

  return {
    status: risk,
    action,
    categories,
    reason_code,
    version: PRODUCT_SAFETY_CONTRACT_VERSION,
    shouldRunReasoning: action === "ALLOW_REASONING",
  };
}

/**
 * Strip any client-forged safety authority fields.
 * Only text / language / sessionId are trusted for classification.
 */
export function sanitizeAnalyzeRequest(req: AnalyzeRequest): {
  text: string;
  language: "vi";
  sessionId?: string;
} {
  return {
    text: typeof req.text === "string" ? req.text : "",
    language: "vi",
    sessionId: req.sessionId,
  };
}

export interface PipelineDeps {
  runSafety?: SafetyRunner;
  runReasoning?: ReasoningRunner;
}

async function defaultSafety(text: string, sessionId?: string): Promise<SafetyEngineResult> {
  const ai = new AIContextualSafetyClassifier({
    config: {
      model: "mock",
      classifierVersion: "ai_contextual_v1.0.0",
      timeoutMs: 25_000,
      maxRetries: 1,
      promptVersion: "safety_prompt_v1.0.0",
    },
  });
  return classifySafety(
    { text, language: "vi", sessionId },
    { aiClassifier: ai }
  );
}

/**
 * Application analyze pipeline — single entry for product safety gate.
 */
export async function analyzeUserInput(
  rawRequest: AnalyzeRequest,
  deps: PipelineDeps = {}
): Promise<AnalyzeResponse> {
  const callOrder: string[] = [];
  const trusted = sanitizeAnalyzeRequest(rawRequest);

  // Input validation
  if (!trusted.text || trusted.text.trim().length === 0) {
    callOrder.push("input_validation_fail");
    const uncertainDecision: ProductSafetyDecision = {
      status: "UNCERTAIN",
      action: "FAIL_CLOSED",
      categories: [],
      reason_code: "invalid_input",
      version: PRODUCT_SAFETY_CONTRACT_VERSION,
      shouldRunReasoning: false,
    };
    return {
      kind: "SAFE_FAILURE",
      safety: uncertainDecision,
      safeFailure: {
        type: "SAFE_FAILURE",
        riskLevel: "UNCERTAIN",
        message:
          "Hiện tại hệ thống không thể xử lý yêu cầu này một cách an toàn. Vui lòng thử lại sau.",
        version: VERSIONS.safety,
      },
      callOrder,
      engine_versions: { safety: VERSIONS.safety },
    };
  }

  callOrder.push("input_validation");

  // SAFETY — always server-side, ignore client safetyStatus/allowReasoning
  const runSafety = deps.runSafety ?? defaultSafety;
  let engineResult: SafetyEngineResult;
  try {
    callOrder.push("safety");
    engineResult = await runSafety(trusted.text, trusted.sessionId);
  } catch {
    callOrder.push("safety_error");
    const decision: ProductSafetyDecision = {
      status: "UNCERTAIN",
      action: "FAIL_CLOSED",
      categories: [],
      reason_code: "safety_exception",
      version: PRODUCT_SAFETY_CONTRACT_VERSION,
      shouldRunReasoning: false,
    };
    // Privacy-safe metadata only
    buildSafetyLogMetadata({
      riskLevel: "UNCERTAIN",
      action: "FAIL_CLOSED",
      classifierVersion: "exception",
      safetyVersion: VERSIONS.safety,
      sessionId: trusted.sessionId,
    });
    return {
      kind: "SAFE_FAILURE",
      safety: decision,
      safeFailure: {
        type: "SAFE_FAILURE",
        riskLevel: "UNCERTAIN",
        message:
          "Hiện tại hệ thống không thể xử lý yêu cầu này một cách an toàn. Vui lòng thử lại sau.",
        version: VERSIONS.safety,
      },
      callOrder,
      engine_versions: { safety: VERSIONS.safety },
    };
  }

  const productDecision = toProductSafetyDecision(engineResult);

  // Privacy-safe log metadata (no raw text)
  buildSafetyLogMetadata({
    riskLevel: productDecision.status,
    action: productDecision.action,
    classifierVersion: engineResult.classification.classifierVersion,
    safetyVersion: engineResult.classification.safetyVersion,
    sessionId: trusted.sessionId,
    signalCategories: productDecision.categories,
  });

  // GATE: HIGH / CRITICAL
  if (productDecision.action === "SAFETY_GATE") {
    callOrder.push("safety_gate_stop");
    return {
      kind: "SAFETY_RESPONSE",
      safety: productDecision,
      safetyResponse: engineResult.response,
      callOrder,
      engine_versions: {
        safety: engineResult.classification.safetyVersion,
      },
    };
  }

  // GATE: UNCERTAIN / FAIL_CLOSED
  if (productDecision.action === "FAIL_CLOSED") {
    callOrder.push("fail_closed");
    return {
      kind: "SAFE_FAILURE",
      safety: productDecision,
      safeFailure: engineResult.failure ?? {
        type: "SAFE_FAILURE",
        riskLevel: "UNCERTAIN",
        message:
          "Hiện tại hệ thống không thể xử lý yêu cầu này một cách an toàn. Vui lòng thử lại sau.",
        version: VERSIONS.safety,
      },
      callOrder,
      engine_versions: {
        safety: engineResult.classification.safetyVersion,
      },
    };
  }

  // ALLOW_REASONING only
  if (productDecision.action !== "ALLOW_REASONING") {
    callOrder.push("unexpected_action_fail_closed");
    return {
      kind: "SAFE_FAILURE",
      safety: {
        ...productDecision,
        action: "FAIL_CLOSED",
        shouldRunReasoning: false,
        reason_code: "unexpected_action",
      },
      callOrder,
      engine_versions: { safety: VERSIONS.safety },
    };
  }

  const runReasoning =
    deps.runReasoning ??
    ((args) => reason(args));

  callOrder.push("reasoning");
  const formulation = runReasoning({
    user_text: trusted.text,
    safety: engineResult,
  });

  // Output validation
  callOrder.push("output_validation");
  if (formulation.status === "SAFETY_GATED") {
    // Reasoning respected safety — should not happen if gate worked, treat as gated
    return {
      kind: "SAFETY_RESPONSE",
      safety: productDecision,
      callOrder,
      engine_versions: {
        safety: VERSIONS.safety,
        reasoning: formulation.engine_version,
      },
    };
  }

  const validated = validateFormulation(formulation);
  if (!validated.ok) {
    return {
      kind: "VALIDATION_FAILURE",
      safety: productDecision,
      callOrder,
      engine_versions: {
        safety: VERSIONS.safety,
        reasoning: formulation.engine_version,
        knowledge: formulation.knowledge_version,
      },
    };
  }

  // Single generation call (Phase 9) — only after ALLOW_REASONING + validated formulation
  callOrder.push("generation");
  let aiOutput = null;
  let generationStatus = "SKIPPED";
  try {
    const gen = await generateControlled({
      userText: trusted.text,
      formulation: validated.value,
      safetyDecision: productDecision,
    });
    generationStatus = gen.status;
    if (gen.status === "OK") {
      aiOutput = gen.formulation ?? null;
    } else {
      // generateControlled returns failures as a normal value (not a thrown
      // exception), so the outer catch below never fires for this case.
      // Without this, the real reason (provider misconfigured, OpenAI auth
      // error, timeout, invalid JSON, etc.) was silently discarded — the
      // client and logs only ever saw "GENERATION_FAILED" with no detail.
      console.error(
        "[generation] non-OK result:",
        gen.status,
        "reason:",
        gen.reason ?? "(none)",
        "provider:",
        gen.provider ?? "(none)"
      );
    }
  } catch (err) {
    // Privacy-safe diagnostic: error name/message only, never user text or
    // secrets. Previously this catch was silent, which made real production
    // failures (missing/invalid AI_PROVIDER, AI_API_KEY, OpenAI API errors)
    // completely invisible in logs — undiagnosable without this.
    console.error(
      "[generation] generateControlled threw, degrading to GENERATION_FAILED:",
      err instanceof Error ? `${err.name}: ${err.message}` : "unknown error"
    );
    generationStatus = "GENERATION_FAILED";
  }

  return {
    kind: "FORMULATION",
    safety: productDecision,
    formulation: validated.value,
    aiOutput,
    generationStatus,
    callOrder,
    engine_versions: {
      safety: engineResult.classification.safetyVersion,
      reasoning: validated.value.engine_version,
      knowledge: validated.value.knowledge_version,
      generation: generationStatus,
    },
  };
}

export { PRODUCT_SAFETY_CONTRACT_VERSION };
