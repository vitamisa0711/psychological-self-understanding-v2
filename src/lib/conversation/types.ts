/**
 * Conversation Engine types — PHASE 15 / V2
 *
 * These types sit ABOVE the existing safety/reasoning/generation layer.
 * They describe the multi-turn conversation, not the single-shot analysis.
 * All Phase 1–14 types are unchanged.
 */

// ─── Conversation state ────────────────────────────────────────────────────

export type ConversationState =
  | "VENTING"          // user is sharing; AI listens, reflects, validates
  | "EXPLORATION"      // AI asks one targeted question to fill a gap
  | "REFLECTION"       // AI offers a tentative hypothesis as a question
  | "FORMULATION"      // enough data; AI shares a multi-hypothesis picture
  | "NO_FORMULATION_YET"; // explicitly valid: insufficient data, that is ok

// ─── Signals that drive state transitions ─────────────────────────────────

export type PatternSignal =
  | "REPETITION"       // "always", "every time", "all my relationships"
  | "GENERALIZATION"   // pattern across multiple people/situations
  | "UNEXPLAINED"      // user themselves says "I don't know why I react like this"
  | "MISMATCH"         // user notes the reaction feels disproportionate
  | "PERSISTENCE"      // emotion/reaction lingers or has significant impact

export type UserSignal =
  | "WANTS_TO_VENT"       // describing, sharing, expressing — not asking why
  | "WANTS_TO_UNDERSTAND" // "why do I...?", "I don't get it", "what does this mean?"
  | "CONFIRMS_REFLECTION" // agrees with AI's tentative hypothesis
  | "DENIES_REFLECTION"   // rejects AI's tentative hypothesis
  | "OVERWHELMED"         // signs of being flooded; pull back
  | "READY_TO_EXPLORE"    // pauses, open-ended, seems ready to go deeper

// Past-experience evidence level (spec section XII)
export type PastExperienceLevel =
  | "LEVEL_0_NO_EVIDENCE"         // no data → do not explore
  | "LEVEL_1_POSSIBLE_RELEVANCE"  // pattern present, no past data → one open question allowed
  | "LEVEL_2_USER_REPORTED"       // user themselves connected past → can compare cautiously

// ─── Memory ───────────────────────────────────────────────────────────────

export interface PartialHypothesis {
  id: string;
  label: string;          // short descriptive label, no jargon
  evidence: string[];     // what the user said that supports this
  confidence: "LOW" | "MODERATE" | "HIGH";
  denied: boolean;        // user explicitly said "not really" or "no"
}

export interface ConversationMemory {
  /** Ordered list of confirmed user observations (what they stated as fact) */
  confirmedObservations: string[];
  /** Hypotheses the AI put forward that were explicitly denied by the user */
  deniedHypotheses: string[];
  /** Tentative hypotheses currently being explored */
  activeHypotheses: PartialHypothesis[];
  /** Questions already asked this conversation — never repeat */
  questionsAsked: string[];
  /** Did the user themselves bring up a past experience? */
  pastExperienceReported: boolean;
  /** Pattern signals detected so far */
  patternSignals: PatternSignal[];
  /** Current past-experience evidence level */
  pastExperienceLevel: PastExperienceLevel;
  /** Emotion labels detected or reported */
  detectedEmotions: string[];
  /** Core trigger identified (what set the situation off) */
  coreTrigger: string | null;
  /** Whether the user seemed to want to just vent without analysis */
  preferredVenting: boolean;
}

export function emptyMemory(): ConversationMemory {
  return {
    confirmedObservations: [],
    deniedHypotheses: [],
    activeHypotheses: [],
    questionsAsked: [],
    pastExperienceReported: false,
    patternSignals: [],
    pastExperienceLevel: "LEVEL_0_NO_EVIDENCE",
    detectedEmotions: [],
    coreTrigger: null,
    preferredVenting: false,
  };
}

// ─── Turn ─────────────────────────────────────────────────────────────────

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  sequence: number;
  state?: ConversationState;
  meta?: Partial<ConversationMemory>;
}

// ─── Engine input / output ────────────────────────────────────────────────

export interface ConversationEngineInput {
  sessionId: string;
  userMessage: string;
  history: ConversationTurn[];
  memory: ConversationMemory;
  currentState: ConversationState;
}

export interface ConversationEngineOutput {
  response: string;
  nextState: ConversationState;
  updatedMemory: ConversationMemory;
  /** The targeted question chosen if state is EXPLORATION, else null */
  questionAsked: string | null;
  /** The hypothesis offered if state is REFLECTION, else null */
  hypothesisOffered: string | null;
}
