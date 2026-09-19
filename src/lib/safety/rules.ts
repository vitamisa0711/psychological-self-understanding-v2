/**
 * Rule-based safety detection — PHASE 3
 * LOCKED SPECIFICATION v1.0.0
 *
 * Context-sensitive: keyword alone ≠ HIGH/CRITICAL.
 * Figurative language must not auto-escalate.
 */

import type { SafetyInput, SafetySignal, RiskLevel } from "./types";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFC").trim();
}

/** Patterns that strongly indicate figurative / non-literal use */
const FIGURATIVE_MARKERS = [
  /chết\s*(vì|mê|cười|mệt|đói|khát|nhớ|ghen|tức)/i,
  /giết\s*(deadline|thời\s*gian|cái\s*)/i,
  /deadline\s*giết/i,
  /phát\s*điên\s*(vì|với|lên)/i,
  /điên\s*(mất|lên)\s*(vì|với)/i,
  /đau\s*(lòng|đầu|bụng)/i,
  /không\s*muốn\s*tồn\s*tại\s*(ở|trong)\s*(văn\s*phòng|công\s*ty|chỗ)/i,
];

function isLikelyFigurative(text: string): boolean {
  return FIGURATIVE_MARKERS.some((re) => re.test(text));
}

interface RuleDef {
  id: string;
  category: SafetySignal["category"];
  severity: SafetySignal["severity"];
  /** All patterns must be considered; matching one explicit pattern triggers */
  patterns: RegExp[];
  /** If true, suppress when figurative markers present */
  suppressIfFigurative?: boolean;
}

const EXPLICIT_RULES: RuleDef[] = [
  {
    id: "suicide-intent",
    category: "SUICIDAL_IDEATION",
    severity: "CRITICAL",
    suppressIfFigurative: true,
    patterns: [
      /tôi\s*(đang\s*)?(định|muốn|sẽ)\s*tự\s*sát/i,
      /tôi\s*đã\s*(chuẩn\s*bị|lên\s*kế\s*hoạch)\s*(để\s*)?tự\s*sát/i,
      /tôi\s*muốn\s*chết(\s|$|[.,!?])/i,
      /tôi\s*sẽ\s*kết\s*thúc\s*cuộc\s*đời/i,
      /tôi\s*định\s*tự\s*tử/i,
    ],
  },
  {
    id: "self-harm-active",
    category: "SELF_HARM",
    severity: "HIGH",
    patterns: [
      /tôi\s*(đang\s*)?tự\s*(làm\s*đau|hại|cắt|gây\s*thương\s*tích)/i,
      /tôi\s*đang\s*cắt\s*(tay|người|cơ\s*thể)/i,
    ],
  },
  {
    id: "immediate-violence-victim",
    category: "IMMEDIATE_DANGER",
    severity: "CRITICAL",
    patterns: [
      /đang\s*(đánh|hành\s*hung|tấn\s*công)\s*tôi/i,
      /người\s*(đó|ta|ấy)\s*đang\s*(đánh|hành\s*hung)\s*tôi/i,
      /tôi\s*đang\s*bị\s*(đánh|hành\s*hung|tấn\s*công)/i,
    ],
  },
  {
    id: "violence-threat",
    category: "VIOLENCE",
    severity: "HIGH",
    patterns: [
      /tôi\s*(sẽ|định|muốn)\s*(giết|đánh\s*chết|hại)\s*(hắn|cô\s*ta|anh\s*ta|người)/i,
      /tôi\s*đang\s*có\s*vũ\s*khí.*?(giết|hại)/i,
    ],
  },
  {
    id: "domestic-violence-now",
    category: "DOMESTIC_VIOLENCE",
    severity: "CRITICAL",
    patterns: [
      /(chồng|vợ|bạn\s*đời)\s*(đang|vừa)\s*(đánh|hành\s*hung)\s*tôi/i,
      /tôi\s*đang\s*bị\s*(chồng|vợ)\s*(đánh|bạo\s*hành)/i,
    ],
  },
  {
    id: "sexual-violence-now",
    category: "SEXUAL_VIOLENCE",
    severity: "CRITICAL",
    patterns: [
      /tôi\s*đang\s*bị\s*(hiếp|xâm\s*hại\s*tình\s*dục|cưỡng\s*hiếp)/i,
      /đang\s*(hiếp|xâm\s*hại\s*tình\s*dục)\s*tôi/i,
    ],
  },
  {
    id: "child-unsafe",
    category: "CHILD_SAFETY",
    severity: "CRITICAL",
    patterns: [
      // Allow natural phrasing between the subject and the risk term, e.g.
      // "đứa trẻ đang ở trong tình trạng nguy hiểm" (not just directly
      // adjacent words), while staying within one clause/sentence.
      /đứa\s*trẻ[^.!?]{0,40}?(nguy\s*hiểm|hành\s*hung|bạo\s*hành|bỏ\s*rơi)/i,
      /con\s*(tôi|em)[^.!?]{0,40}?(bị\s*đánh|nguy\s*hiểm)/i,
    ],
  },
  {
    id: "medical-emergency",
    category: "MEDICAL_EMERGENCY",
    severity: "CRITICAL",
    patterns: [
      /tôi\s*(đang|sắp)\s*(ngất|mất\s*ý\s*thức|không\s*thở\s*được)/i,
      /tôi\s*vừa\s*(uống\s*thuốc\s*quá\s*liều|overdose)/i,
    ],
  },
  {
    id: "severe-ed-risk",
    category: "SEVERE_EATING_DISORDER_RISK",
    severity: "HIGH",
    patterns: [
      /tôi\s*(đã|đang)\s*(nhịn\s*ăn\s*nhiều\s*ngày|không\s*ăn\s*gì\s*vài\s*ngày)/i,
      /tôi\s*đang\s*gây\s*nôn\s*sau\s*mỗi\s*bữa/i,
    ],
  },
];

/** Moderate signals — continue reasoning allowed */
const MODERATE_RULES: RuleDef[] = [
  {
    id: "passive-death-wish",
    category: "SUICIDAL_IDEATION",
    severity: "MODERATE",
    suppressIfFigurative: true,
    patterns: [
      /tôi\s*không\s*muốn\s*sống\s*nữa/i,
      /tôi\s*muốn\s*biến\s*mất/i,
      /giá\s*như\s*tôi\s*không\s*tồn\s*tại/i,
    ],
  },
];

export interface RuleDetectionResult {
  signals: SafetySignal[];
  riskLevel: RiskLevel;
}

function matchRules(
  text: string,
  rules: RuleDef[],
  figurative: boolean,
  textForSuppressible: string = text
): SafetySignal[] {
  const signals: SafetySignal[] = [];
  for (const rule of rules) {
    if (rule.suppressIfFigurative && figurative) continue;
    // For suppressIfFigurative rules, test against the possibly-stripped text
    // (quoted third-party spans removed) so that a friend's reported words
    // don't trigger first-person intent rules as if the user said them.
    const textToTest = rule.suppressIfFigurative ? textForSuppressible : text;
    for (const pattern of rule.patterns) {
      if (pattern.test(textToTest)) {
        signals.push({
          signalId: `rule-${rule.id}`,
          category: rule.category,
          severity: rule.severity,
          evidence: [`matched:${rule.id}`],
          confidence: "HIGH",
          source: "RULE",
        });
        break;
      }
    }
  }
  return signals;
}

function maxSeverityToRisk(signals: SafetySignal[]): RiskLevel {
  if (signals.length === 0) return "LOW";
  let max: RiskLevel = "LOW";
  const order: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
  for (const s of signals) {
    const sev = s.severity as RiskLevel;
    if (order.indexOf(sev) > order.indexOf(max)) {
      max = sev;
    }
  }
  return max;
}

/**
 * Run deterministic rule layer.
 */
/**
 * Detect patterns that clearly introduce a third-party direct-quote
 * (e.g. "Bạn tôi nhắn: \"Tôi muốn chết.\""). We strip these spans before
 * running first-person intent rules, so a quoted statement by someone else
 * does not trigger CRITICAL/HIGH as if it were the user's own intent.
 * Only the first-person-intent rules (suppressIfFigurative) benefit from
 * this — other rules (violence victim, medical emergency, etc.) run against
 * the original full text, because those can be relevant even in report-about
 * contexts.
 */
const THIRD_PARTY_QUOTE_LEADERS = [
  /bạn\s*(tôi|mình|em).*?(nói|nhắn|bảo|viết)\s*[:：]?\s*/i,
  /(nó|hắn|cô\s*ấy|anh\s*ấy|họ)\s*(nói|nhắn)\s*[:：]?\s*/i,
];

function hasThirdPartyQuote(text: string): boolean {
  return THIRD_PARTY_QUOTE_LEADERS.some((p) => p.test(text));
}

function stripQuotedSpans(text: string): string {
  // Strip text inside common Vietnamese/Unicode quote pairs.
  return text.replace(/[«""][^«»""']*[»""']/g, " ");
}

export function detectSafetyRules(input: SafetyInput): RuleDetectionResult {
  const text = input.text;
  const figurative = isLikelyFigurative(text);

  // For rules that suppress on figurative context (suicide-intent,
  // passive-death-wish), also evaluate against the text with any
  // directly-quoted third-party spans removed — so "Bạn tôi nhắn:
  // 'Tôi muốn chết.'" is not escalated as if the user said it themselves.
  const isQuotedContext = hasThirdPartyQuote(text);
  const textForFirstPerson = isQuotedContext ? stripQuotedSpans(text) : text;

  const explicit = matchRules(text, EXPLICIT_RULES, figurative, textForFirstPerson);
  const moderate = matchRules(text, MODERATE_RULES, figurative, textForFirstPerson);
  const signals = [...explicit, ...moderate];

  return {
    signals,
    riskLevel: maxSeverityToRisk(signals),
  };
}
