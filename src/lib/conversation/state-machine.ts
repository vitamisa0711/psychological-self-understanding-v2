/**
 * Conversation State Machine — PHASE 15 / V2
 *
 * Decides the next ConversationState based on:
 *   - current state
 *   - user signals
 *   - pattern signals
 *   - memory (what has already been confirmed / denied / asked)
 *
 * State transitions are driven by content and signals, NOT by turn count.
 * Two-way transitions are explicitly supported.
 */

import type {
  ConversationState,
  ConversationMemory,
  UserSignal,
  PatternSignal,
} from "./types";

interface TransitionInput {
  currentState: ConversationState;
  userSignal: UserSignal;
  patternSignals: PatternSignal[];
  memory: ConversationMemory;
  historyLength: number;
}

export function nextState(input: TransitionInput): ConversationState {
  const { currentState, userSignal, patternSignals, memory, historyLength } = input;

  // ── Hard overrides ─────────────────────────────────────────────────────

  // User is overwhelmed → always drop back to VENTING
  if (userSignal === "OVERWHELMED") return "VENTING";

  // User denied AI reflection → back to EXPLORATION to recalibrate
  if (userSignal === "DENIES_REFLECTION") return "EXPLORATION";

  // ── State-specific logic ───────────────────────────────────────────────

  switch (currentState) {
    case "VENTING": {
      // Stay in VENTING unless there's a clear signal to move
      if (userSignal === "WANTS_TO_VENT") return "VENTING";
      if (userSignal === "WANTS_TO_UNDERSTAND") return "EXPLORATION";
      if (
        userSignal === "READY_TO_EXPLORE" &&
        (patternSignals.includes("REPETITION") ||
          patternSignals.includes("UNEXPLAINED") ||
          patternSignals.includes("MISMATCH"))
      ) {
        return "EXPLORATION";
      }
      // After several turns of venting without a pattern, stay in VENTING
      return "VENTING";
    }

    case "EXPLORATION": {
      if (userSignal === "WANTS_TO_VENT") {
        // User wants to keep sharing → respect that, go back to VENTING
        return "VENTING";
      }
      if (userSignal === "WANTS_TO_UNDERSTAND") {
        return "EXPLORATION";
      }
      // Enough confirmed observations and at least one hypothesis to try
      if (
        memory.confirmedObservations.length >= 2 &&
        memory.activeHypotheses.length >= 1 &&
        memory.activeHypotheses.some((h) => !h.denied)
      ) {
        return "REFLECTION";
      }
      return "EXPLORATION";
    }

    case "REFLECTION": {
      if (userSignal === "CONFIRMS_REFLECTION") {
        // Confirmed one hypothesis — check if we have enough for formulation
        const confirmedHypotheses = memory.activeHypotheses.filter((h) => !h.denied);
        if (
          confirmedHypotheses.length >= 1 &&
          memory.confirmedObservations.length >= 2 &&
          memory.detectedEmotions.length >= 1
        ) {
          return "FORMULATION";
        }
        // Not enough yet → stay in EXPLORATION for more data
        return "EXPLORATION";
      }
      if (userSignal === "WANTS_TO_VENT") {
        // User wants to keep sharing more → let them
        return "VENTING";
      }
      return "REFLECTION";
    }

    case "FORMULATION": {
      // From FORMULATION, user can always go back to VENTING/EXPLORATION
      if (userSignal === "WANTS_TO_VENT") return "VENTING";
      if (userSignal === "WANTS_TO_UNDERSTAND") return "EXPLORATION";
      return "FORMULATION";
    }

    case "NO_FORMULATION_YET": {
      if (userSignal === "WANTS_TO_VENT") return "VENTING";
      if (userSignal === "WANTS_TO_UNDERSTAND") return "EXPLORATION";
      return "NO_FORMULATION_YET";
    }
  }
}

/**
 * Should the AI produce a full formulation this turn?
 * Only when state is FORMULATION and data quality is sufficient.
 */
export function shouldFormulate(
  state: ConversationState,
  memory: ConversationMemory
): boolean {
  if (state !== "FORMULATION") return false;
  return (
    memory.confirmedObservations.length >= 2 &&
    memory.activeHypotheses.some((h) => !h.denied)
  );
}
