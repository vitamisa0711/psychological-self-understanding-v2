/**
 * Safety orchestrator — PHASE 3
 * LOCKED SPECIFICATION v1.0.0
 *
 * Flow: input → rules → optional AI → validate → resolve → decision
 * Failures → UNCERTAIN / SAFE_FAILURE (never CRITICAL by default)
 */

import { VERSIONS } from "@/lib/config/versions";
import { RuleBasedSafetyClassifier, validateClassificationOutput } from "./classifier";
import { buildEngineResult, resolveDisagreement } from "./decision";
import { safetyInputSchema } from "./schema";
import type {
  SafetyClassifier,
  SafetyEngineResult,
  SafetyInput,
  SafetyClassification,
  RiskLevel,
} from "./types";

const SAFETY_TIMEOUT_MS = 25_000;
const MAX_RETRY = 1;

export interface OrchestratorOptions {
  /** Optional AI classifier (Phase 4). If absent, rules-only. */
  aiClassifier?: SafetyClassifier;
  timeoutMs?: number;
}

function uncertainResult(classifierVersion: string): SafetyEngineResult {
  const classification: SafetyClassification = {
    riskLevel: "UNCERTAIN",
    signals: [],
    confidence: "INSUFFICIENT",
    classifierVersion,
    safetyVersion: VERSIONS.safety,
  };
  return buildEngineResult(classification);
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("SAFETY_TIMEOUT")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Main entry: classifySafety
 * Never calls psychological reasoning.
 */
export async function classifySafety(
  input: SafetyInput,
  options: OrchestratorOptions = {}
): Promise<SafetyEngineResult> {
  const timeoutMs = options.timeoutMs ?? SAFETY_TIMEOUT_MS;

  // Input validation
  const inputParsed = safetyInputSchema.safeParse(input);
  if (!inputParsed.success) {
    return uncertainResult("invalid_input");
  }

  const rules = new RuleBasedSafetyClassifier();

  let ruleClassification: SafetyClassification;
  try {
    ruleClassification = await withTimeout(rules.classify(inputParsed.data), timeoutMs);
  } catch {
    return uncertainResult("rules_timeout_or_error");
  }

  // Rules alone produced HIGH/CRITICAL → stop (no need AI to downgrade)
  if (
    ruleClassification.riskLevel === "HIGH" ||
    ruleClassification.riskLevel === "CRITICAL"
  ) {
    return buildEngineResult(ruleClassification);
  }

  // Optional AI path
  if (!options.aiClassifier) {
    return buildEngineResult(ruleClassification);
  }

  let aiClassification: SafetyClassification | null = null;
  let attempts = 0;
  while (attempts <= MAX_RETRY) {
    try {
      const raw = await withTimeout(
        options.aiClassifier.classify(inputParsed.data),
        timeoutMs
      );
      aiClassification = validateClassificationOutput(raw);
      if (aiClassification.riskLevel !== "UNCERTAIN" || attempts === MAX_RETRY) {
        break;
      }
    } catch {
      if (attempts >= MAX_RETRY) {
        // AI failed; if rules were LOW/MODERATE, still fail-closed to UNCERTAIN
        // only when AI was requested and failed? Spec: classifier failure → UNCERTAIN.
        // When AI is part of the pipeline and fails → UNCERTAIN.
        return uncertainResult("ai_timeout_or_error");
      }
    }
    attempts += 1;
  }

  if (!aiClassification) {
    return uncertainResult("ai_unavailable");
  }

  if (aiClassification.riskLevel === "UNCERTAIN") {
    // Rules HIGH/CRITICAL already returned early above, so ruleClassification
    // here is always LOW/MODERATE/UNCERTAIN — fail closed to UNCERTAIN.
    return uncertainResult("ai_uncertain");
  }

  const resolved: RiskLevel = resolveDisagreement(
    ruleClassification.riskLevel,
    aiClassification.riskLevel
  );

  const merged: SafetyClassification = {
    riskLevel: resolved,
    signals: [
      ...ruleClassification.signals,
      ...aiClassification.signals.map((s) => ({
        ...s,
        source: s.source === "RULE" ? ("BOTH" as const) : s.source,
      })),
    ],
    confidence:
      resolved === "UNCERTAIN" ? "INSUFFICIENT" : aiClassification.confidence,
    classifierVersion: `rules+${aiClassification.classifierVersion}`,
    safetyVersion: VERSIONS.safety,
  };

  return buildEngineResult(merged);
}

export { SAFETY_TIMEOUT_MS, MAX_RETRY };
