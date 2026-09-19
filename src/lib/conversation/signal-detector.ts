/**
 * Signal Detector — PHASE 15 / V2
 *
 * Reads the latest user turn (and history) to determine:
 *   1. What the user seems to want right now (UserSignal)
 *   2. What pattern signals are present (PatternSignal[])
 *   3. Whether past-experience evidence level should be updated
 *
 * No psychological conclusions are drawn here — only signals for the
 * state machine and exploration selector to act on.
 */

import type {
  UserSignal,
  PatternSignal,
  PastExperienceLevel,
  ConversationTurn,
  ConversationMemory,
} from "./types";

// ─── Pattern signal detectors ─────────────────────────────────────────────

const REPETITION_PATTERNS = [
  /luôn\s*luôn|luôn\s*như\s*vậy|lần\s*nào\s*cũng|mỗi\s*lần|lặp\s*lại|lại\s*như\s*vậy/i,
  /always|every\s*time|all\s*the\s*time|repeatedly|again\s*and\s*again/i,
];

const GENERALIZATION_PATTERNS = [
  /mọi\s*mối\s*quan\s*hệ|ai\s*cũng\s*vậy|người\s*nào\s*cũng|mọi\s*người|tất\s*cả\s*đều/i,
  /mọi\s*hoàn\s*cảnh|bất\s*kỳ\s*ai|cứ\s*.*\s*là|every\s*relationship|everyone/i,
];

const UNEXPLAINED_PATTERNS = [
  /không\s*hiểu\s*(sao|tại\s*sao)|không\s*biết\s*(sao|tại\s*sao)|tại\s*sao\s*(mình|tôi)\s*(lại|cứ)/i,
  /vô\s*lý\s*mà|chuyện\s*nhỏ\s*(mà|nhưng)|không\s*đáng\s*(mà|nhưng)/i,
  /I\s*don'?t\s*know\s*why|don'?t\s*understand\s*why|makes\s*no\s*sense/i,
];

const MISMATCH_PATTERNS = [
  /phản\s*ứng\s*(quá|mạnh)|cảm\s*giác\s*(quá|mạnh)|thái\s*quá|bất\s*bình\s*thường/i,
  /biết\s*là\s*(nhỏ|không\s*đáng|vô\s*lý)\s*(mà|nhưng)/i,
  /overreact|too\s*much|disproportionate|doesn'?t\s*make\s*sense/i,
];

const PERSISTENCE_PATTERNS = [
  /mãi|suốt|cả\s*ngày|không\s*hết|kéo\s*dài|vẫn\s*còn|vẫn\s*như\s*vậy/i,
  /ảnh\s*hưởng|tác\s*động|không\s*thoát\s*ra|stuck|can'?t\s*stop\s*thinking/i,
];

// ─── User-intent signal detectors ────────────────────────────────────────

const WANTS_TO_UNDERSTAND_PATTERNS = [
  /tại\s*sao\s*(mình|tôi|em)|mình\s*(không\s*hiểu|muốn\s*hiểu)|hiểu\s*(vấn\s*đề|bản\s*thân)/i,
  /nguyên\s*nhân|gốc\s*rễ|vì\s*sao\s*(mình|tôi)|làm\s*sao\s*để\s*hiểu/i,
  /why\s*(do\s*I|am\s*I)|what\s*does\s*this\s*mean|help\s*me\s*understand/i,
];

const CONFIRMS_REFLECTION_PATTERNS = [
  /^(đúng|đúng\s*rồi|đúng\s*vậy|đúng\s*như\s*vậy|đúng\s*là|vâng|ừ|ừm|phải)\b/i,
  /^(yes|yeah|exactly|right|that'?s\s*(right|it|correct)|spot\s*on)\b/i,
  /cảm\s*giác\s*đúng|có\s*vẻ\s*đúng|khá\s*đúng|mình\s*nghĩ\s*(là\s*)?đúng/i,
];

const DENIES_REFLECTION_PATTERNS = [
  /^(không|không\s*hẳn|không\s*phải|không\s*đúng|chưa\s*hẳn|không\s*hoàn\s*toàn)\b/i,
  /^(no|not\s*really|not\s*quite|not\s*exactly|not\s*sure|hmm\s*not)\b/i,
  /không\s*(đúng\s*lắm|phải\s*vậy|hẳn\s*như\s*vậy)/i,
];

const PAST_EXPERIENCE_PATTERNS = [
  /hồi\s*(nhỏ|bé|xưa)|khi\s*còn\s*(nhỏ|bé)|trước\s*đây|ngày\s*trước/i,
  /thời\s*thơ\s*ấu|cha\s*mẹ|bố\s*mẹ|mẹ\s*(tôi|mình)|bố\s*(tôi|mình)/i,
  /mối\s*quan\s*hệ\s*(trước|cũ)|người\s*yêu\s*cũ|ex\b/i,
  /lần\s*trước|lúc\s*nhỏ|tuổi\s*thơ|childhood|growing\s*up|back\s*then/i,
];

const OVERWHELMED_PATTERNS = [
  /quá\s*nhiều|không\s*chịu\s*nổi|chịu\s*không\s*nổi|ngộp|overwhelm/i,
  /mệt\s*quá|thôi\s*không\s*muốn\s*nói|dừng\s*lại|cần\s*nghỉ/i,
];

// ─── Helper ───────────────────────────────────────────────────────────────

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

// ─── Public API ───────────────────────────────────────────────────────────

export interface SignalDetectionResult {
  userSignal: UserSignal;
  patternSignals: PatternSignal[];
  pastExperienceLevel: PastExperienceLevel;
  pastExperienceReported: boolean;
}

export function detectSignals(
  userMessage: string,
  history: ConversationTurn[],
  memory: ConversationMemory,
  /** The immediately preceding AI turn, if any */
  lastAssistantTurn: ConversationTurn | null
): SignalDetectionResult {
  const text = userMessage;
  const patternSignals: PatternSignal[] = [...memory.patternSignals];

  // ── Pattern signals ────────────────────────────────────────────────────
  if (matchesAny(text, REPETITION_PATTERNS) && !patternSignals.includes("REPETITION")) {
    patternSignals.push("REPETITION");
  }
  if (matchesAny(text, GENERALIZATION_PATTERNS) && !patternSignals.includes("GENERALIZATION")) {
    patternSignals.push("GENERALIZATION");
  }
  if (matchesAny(text, UNEXPLAINED_PATTERNS) && !patternSignals.includes("UNEXPLAINED")) {
    patternSignals.push("UNEXPLAINED");
  }
  if (matchesAny(text, MISMATCH_PATTERNS) && !patternSignals.includes("MISMATCH")) {
    patternSignals.push("MISMATCH");
  }
  if (matchesAny(text, PERSISTENCE_PATTERNS) && !patternSignals.includes("PERSISTENCE")) {
    patternSignals.push("PERSISTENCE");
  }

  // ── Past experience ────────────────────────────────────────────────────
  const pastExperienceReported =
    memory.pastExperienceReported || matchesAny(text, PAST_EXPERIENCE_PATTERNS);

  let pastExperienceLevel = memory.pastExperienceLevel;
  if (pastExperienceReported && pastExperienceLevel === "LEVEL_0_NO_EVIDENCE") {
    pastExperienceLevel = "LEVEL_2_USER_REPORTED";
  } else if (
    patternSignals.length >= 2 &&
    pastExperienceLevel === "LEVEL_0_NO_EVIDENCE"
  ) {
    // Multiple pattern signals without past data → possible relevance
    pastExperienceLevel = "LEVEL_1_POSSIBLE_RELEVANCE";
  }

  // ── User intent signal ─────────────────────────────────────────────────
  let userSignal: UserSignal;

  if (matchesAny(text, OVERWHELMED_PATTERNS)) {
    userSignal = "OVERWHELMED";
  } else if (
    lastAssistantTurn?.state === "REFLECTION" &&
    matchesAny(text, DENIES_REFLECTION_PATTERNS)
  ) {
    userSignal = "DENIES_REFLECTION";
  } else if (
    lastAssistantTurn?.state === "REFLECTION" &&
    matchesAny(text, CONFIRMS_REFLECTION_PATTERNS)
  ) {
    userSignal = "CONFIRMS_REFLECTION";
  } else if (matchesAny(text, WANTS_TO_UNDERSTAND_PATTERNS)) {
    userSignal = "WANTS_TO_UNDERSTAND";
  } else if (patternSignals.length > 0 && history.length >= 2) {
    // Has interesting signals and has had some exchange → ready to explore
    userSignal = "READY_TO_EXPLORE";
  } else {
    userSignal = "WANTS_TO_VENT";
  }

  return {
    userSignal,
    patternSignals,
    pastExperienceLevel,
    pastExperienceReported,
  };
}
