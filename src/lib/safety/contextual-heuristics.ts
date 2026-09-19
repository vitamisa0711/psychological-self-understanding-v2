/**
 * Contextual heuristics for Phase 4 AI classifier (offline / mock path).
 * Not a replacement for Phase 3 rules. Does not diagnose.
 *
 * Handles: speaker attribution, quoted speech, negation, temporal cues.
 */

export type SpeakerAttribution =
  | "USER"
  | "THIRD_PARTY"
  | "MIXED"
  | "HYPOTHETICAL"
  | "UNKNOWN";

export type TemporalFrame = "CURRENT" | "PAST" | "RESOLVED" | "FUTURE" | "UNKNOWN";

export interface ContextualAnalysis {
  speaker: SpeakerAttribution;
  temporal: TemporalFrame;
  hasNegationOfHarm: boolean;
  hasQuotedThirdParty: boolean;
  hasExplicitUserIntent: boolean;
  hasAmbiguousDistress: boolean;
  promptInjectionAttempt: boolean;
  notes: string[];
}

const QUOTE_PATTERNS = [
  /bạn\s*(tôi|mình|em).*?(nói|nhắn|bảo|viết)\s*[:：]?\s*[«"“]/i,
  /(nó|hắn|cô\s*ấy|anh\s*ấy|họ)\s*(nói|nhắn)\s*[:：]?\s*[«"“']/i,
  /[«"“'][^«"“']{0,80}(muốn\s*chết|tự\s*sát|tự\s*tử)[^«"“']{0,40}[»"”']/i,
];

const REPORTED_SPEECH = [
  /bạn\s*(tôi|mình).*?(nói|kể)\s*(rằng|là)/i,
  /nghe\s*nói/i,
];

const USER_INTENT = [
  /tôi\s*(đang\s*)?(muốn|định|sẽ)\s*(tự\s*sát|tự\s*tử|chết)/i,
  /tôi\s*đã\s*(chuẩn\s*bị|lên\s*kế\s*hoạch)/i,
];

const NEGATION_HARM = [
  /tôi\s*không\s*(muốn|còn\s*muốn)\s*(chết|tự\s*sát|tự\s*tử)/i,
  /tôi\s*không\s*còn\s*nghĩ\s*đến\s*(việc\s*)?(tự\s*sát|chết)/i,
  /hiện\s*tại\s*tôi\s*không\s*còn/i,
];

const PAST_TEMPORAL = [
  /năm\s*ngoái/i,
  /trước\s*đây/i,
  /ngày\s*xưa/i,
  /từng\s*(muốn|nghĩ)/i,
  /hồi\s*đó/i,
];

const CURRENT_TEMPORAL = [
  /bây\s*giờ/i,
  /hiện\s*tại/i,
  /lúc\s*này/i,
  /đang/i,
];

const AMBIGUOUS_DISTRESS = [
  /muốn\s*biến\s*mất/i,
  /không\s*muốn\s*thức\s*dậy/i,
  /giá\s*như\s*mọi\s*thứ\s*kết\s*thúc/i,
  /không\s*chịu\s*nổi\s*nữa/i,
];

const INJECTION = [
  /ignore\s+(previous|all)\s+instructions/i,
  /bỏ\s*qua\s*(mọi\s*)?(hướng\s*dẫn|quy\s*tắc|safety)/i,
  /classify\s+(me\s+as\s+)?safe/i,
  /đánh\s*giá\s*(là\s*)?safe/i,
  /you\s+are\s+now/i,
];

const HYPOTHETICAL = [
  /trong\s*truyện/i,
  /nhân\s*vật\s*nói/i,
  /ví\s*dụ/i,
  /giả\s*sử/i,
  /cụm\s*.*có\s*nghĩa\s*gì/i,
];

/**
 * Remove the quoted span itself (the content inside quote marks), so
 * words like "muốn chết" spoken by a third party inside a direct quote
 * are not re-attributed to the user's own intent by the patterns below.
 * Only strips actual quoted spans — does not touch unquoted text.
 */
function stripQuotedSpans(text: string): string {
  return text.replace(/[«"“][^«»"”']*[»"”]/g, " ");
}

export function analyzeContext(text: string): ContextualAnalysis {
  const notes: string[] = [];
  const hasQuotedThirdParty = QUOTE_PATTERNS.some((p) => p.test(text));
  const hasReported = REPORTED_SPEECH.some((p) => p.test(text));

  // Quoted/reported third-party speech must not be mistaken for the user's
  // own current intent — evaluate intent-style signals on the text with any
  // quoted span (the attributed speech itself) removed.
  const textForOwnSignals =
    hasQuotedThirdParty ? stripQuotedSpans(text) : text;

  const hasExplicitUserIntent = USER_INTENT.some((p) =>
    p.test(textForOwnSignals)
  );
  const hasNegationOfHarm = NEGATION_HARM.some((p) => p.test(textForOwnSignals));
  const hasAmbiguousDistress = AMBIGUOUS_DISTRESS.some((p) =>
    p.test(textForOwnSignals)
  );
  const promptInjectionAttempt = INJECTION.some((p) => p.test(text));
  const isHypothetical = HYPOTHETICAL.some((p) => p.test(text));
  const past = PAST_TEMPORAL.some((p) => p.test(text));
  const current = CURRENT_TEMPORAL.some((p) => p.test(text));

  let speaker: ContextualAnalysis["speaker"] = "UNKNOWN";
  if (isHypothetical) {
    speaker = "HYPOTHETICAL";
    notes.push("hypothetical_or_educational");
  } else if (hasQuotedThirdParty || hasReported) {
    if (hasExplicitUserIntent) {
      speaker = "MIXED";
      notes.push("third_party_quote_plus_user_intent");
    } else {
      speaker = "THIRD_PARTY";
      notes.push("third_party_or_quoted_speech");
    }
  } else if (hasExplicitUserIntent || /^tôi\b/i.test(text.trim())) {
    speaker = "USER";
  }

  let temporal: ContextualAnalysis["temporal"] = "UNKNOWN";
  if (hasNegationOfHarm && past) {
    temporal = "RESOLVED";
    notes.push("past_ideation_with_negation");
  } else if (past && !current) {
    temporal = "PAST";
  } else if (current || hasExplicitUserIntent) {
    temporal = "CURRENT";
  }

  if (promptInjectionAttempt) notes.push("prompt_injection_attempt");

  return {
    speaker,
    temporal,
    hasNegationOfHarm,
    hasQuotedThirdParty: hasQuotedThirdParty || hasReported,
    hasExplicitUserIntent,
    hasAmbiguousDistress,
    promptInjectionAttempt,
    notes,
  };
}
