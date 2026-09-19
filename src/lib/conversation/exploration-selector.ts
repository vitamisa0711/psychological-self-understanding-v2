/**
 * Exploration Selector — PHASE 15 / V2
 *
 * Selects the single most valuable question to ask based on:
 *   - what information is still missing
 *   - what pattern signals have been detected
 *   - what has already been asked (never repeat)
 *   - past-experience level (never lead toward trauma)
 *
 * Hard rules (from spec):
 *   - Only ONE question returned
 *   - No leading questions (no hypothesis in the question)
 *   - No childhood/trauma/attachment questions unless Level 1 or 2
 *   - Never ask about something the user already answered
 */

import type { ConversationMemory, PatternSignal, PastExperienceLevel } from "./types";

export interface ExplorationQuestion {
  text: string;
  rationale: string; // internal, not shown to user
}

interface SelectorInput {
  memory: ConversationMemory;
  patternSignals: PatternSignal[];
  pastExperienceLevel: PastExperienceLevel;
  hasEmotion: boolean;
  hasTrigger: boolean;
  hasThought: boolean;
}

// Question pool — ordered from most fundamental to most specific
// Each entry has a "key" used to deduplicate against questionsAsked
const QUESTION_POOL: Array<{
  key: string;
  text: string;
  rationale: string;
  condition: (i: SelectorInput) => boolean;
}> = [
  // Core experience clarity
  {
    key: "emotion_felt",
    text: "Trong lúc đó, bạn cảm thấy gì nhiều nhất?",
    rationale: "emotion not yet identified",
    condition: (i) => !i.hasEmotion,
  },
  {
    key: "trigger_event",
    text: "Điều gì đã xảy ra ngay trước khi bạn bắt đầu cảm thấy như vậy?",
    rationale: "trigger not yet identified",
    condition: (i) => i.hasEmotion && !i.hasTrigger,
  },
  {
    key: "inner_thought",
    text: "Lúc đó trong đầu bạn đang nghĩ điều gì?",
    rationale: "automatic thought not yet identified",
    condition: (i) => i.hasEmotion && i.hasTrigger && !i.hasThought,
  },

  // Pattern exploration (only when signal is present)
  {
    key: "pattern_repetition",
    text: "Phản ứng này có thường xảy ra với bạn trong những tình huống tương tự không?",
    rationale: "repetition signal detected",
    condition: (i) =>
      i.patternSignals.includes("REPETITION") &&
      !i.memory.questionsAsked.includes("pattern_repetition"),
  },
  {
    key: "pattern_generalization",
    text: "Điều này chỉ xảy ra với người này, hay bạn cũng từng gặp tình huống tương tự với người khác?",
    rationale: "generalization signal detected",
    condition: (i) =>
      i.patternSignals.includes("GENERALIZATION") &&
      !i.memory.questionsAsked.includes("pattern_generalization"),
  },
  {
    key: "unexplained_reaction",
    text: "Phần nào của phản ứng đó khiến bạn thấy khó hiểu nhất?",
    rationale: "unexplained reaction signal",
    condition: (i) =>
      i.patternSignals.includes("UNEXPLAINED") &&
      !i.memory.questionsAsked.includes("unexplained_reaction"),
  },

  // Past experience — only at Level 1 or 2, open questions only (spec X)
  {
    key: "past_similar_feeling",
    text: "Cảm giác này có từng xuất hiện với bạn trong những mối quan hệ hoặc giai đoạn trước đây không?",
    rationale: "level 1 or 2 past evidence, no past question asked yet",
    condition: (i) =>
      (i.pastExperienceLevel === "LEVEL_1_POSSIBLE_RELEVANCE" ||
        i.pastExperienceLevel === "LEVEL_2_USER_REPORTED") &&
      !i.memory.questionsAsked.includes("past_similar_feeling") &&
      !i.memory.questionsAsked.includes("past_childhood"),
  },
  {
    key: "past_childhood",
    text: "Bạn có nhớ cảm giác tương tự từng xuất hiện khi bạn còn nhỏ không?",
    rationale: "level 2 confirmed, prior general past question already asked",
    condition: (i) =>
      i.pastExperienceLevel === "LEVEL_2_USER_REPORTED" &&
      i.memory.questionsAsked.includes("past_similar_feeling") &&
      !i.memory.questionsAsked.includes("past_childhood"),
  },

  // Deeper understanding when hypothesis denied
  {
    key: "what_feels_closer",
    text: "Nếu không phải vậy, bạn mô tả cảm giác đó như thế nào?",
    rationale: "hypothesis was denied, need user's own framing",
    condition: (i) =>
      i.memory.deniedHypotheses.length > 0 &&
      !i.memory.questionsAsked.includes("what_feels_closer"),
  },

  // Need identification
  {
    key: "unmet_need",
    text: "Trong tình huống đó, bạn đang cần gì nhất từ người kia?",
    rationale: "need not yet identified",
    condition: (i) =>
      i.hasEmotion &&
      i.hasTrigger &&
      i.memory.confirmedObservations.length >= 2 &&
      !i.memory.questionsAsked.includes("unmet_need"),
  },
];

export function selectExplorationQuestion(
  input: SelectorInput
): ExplorationQuestion | null {
  for (const q of QUESTION_POOL) {
    if (
      q.condition(input) &&
      !input.memory.questionsAsked.includes(q.key)
    ) {
      return { text: q.text, rationale: q.rationale };
    }
  }
  // No suitable question found → do not force one
  return null;
}
