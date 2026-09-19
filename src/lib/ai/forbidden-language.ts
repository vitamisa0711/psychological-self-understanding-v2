/**
 * Forbidden-language detectors — PHASE 8
 * Enforcement layer (not prompt-only).
 */

import { fixViBoundaries } from "@/lib/utils/regex";

export interface DetectionResult {
  detected: boolean;
  matches: string[];
}

function scan(text: string, patterns: RegExp[]): DetectionResult {
  const matches: string[] = [];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) matches.push(m[0]);
  }
  return { detected: matches.length > 0, matches };
}

// Wrapped with fixViBoundaries: plain `\b` does not reliably match around
// Vietnamese letters with diacritics (see src/lib/utils/regex.ts).
const ADVICE = fixViBoundaries([
  /\bbạn\s+nên\b/i,
  /\bbạn\s+cần\b/i,
  /\bhãy\s+(thử|làm|nói|nghỉ|đi|chia)/i,
  /\bđừng\s+(nên\s+)?(làm|nghĩ|nói|tiếp)/i,
  /\btốt\s+nhất\s+là\b/i,
  /\bbạn\s+có\s+thể\s+thử\b/i,
  /\bđiều\s+bạn\s+cần\s+làm\b/i,
  /\bmột\s+cách\s+tốt\s+là\b/i,
  /\bsẽ\s+tốt\s+hơn\s+nếu\b/i,
  /\bnên\s+chia\s+tay\b/i,
  /\bnên\s+nghỉ\s+việc\b/i,
]);

const DIAGNOSIS = fixViBoundaries([
  /\bbạn\s+bị\s+(PTSD|ADHD|borderline|trầm\s*cảm|rối\s*loạn)/i,
  /\bbạn\s+mắc\b/i,
  /\bbạn\s+có\s+rối\s+loạn\b/i,
  /\bđây\s+là\s+(PTSD|borderline|ADHD)\b/i,
  /\bchẩn\s+đoán\s+(của\s+bạn|là)\b/i,
]);

/** Safe diagnostic hedges should not false-positive */
const DIAGNOSIS_SAFE = [
  /chưa\s+đủ\s+thông\s+tin\s+để\s+(kết\s+luận|nói)\s+rằng\s+bạn\s+(bị|có)/i,
  /không\s+thể\s+kết\s+luận\s+bạn\s+bị/i,
  /có\s+một\s+số\s+điểm\s+tương\s+đồng\s+với/i,
];

const MIND_READ = fixViBoundaries([
  /\banh\s+ấy\s+không\s+yêu\s+bạn\b/i,
  /\bcô\s+ấy\s+cố\s+tình\b/i,
  /\bmẹ\s+bạn\s+không\s+(thương|quan\s*tâm)\b/i,
  /\bngười\s+đó\s+đang\s+gaslighting\b/i,
  /\bhắn\s+cố\s+tình\s+làm\s+bạn\s+(đau|tổn\s*thương)\b/i,
]);

const CHILDHOOD = fixViBoundaries([
  /\bdo\s+tuổi\s+thơ\b/i,
  /\bbắt\s+nguồn\s+từ\s+tuổi\s+thơ\b/i,
  /\bdo\s+cha\s+mẹ\b/i,
  /\bchildhood\s+trauma\b/i,
  /\bvì\s+bạn\s+từng\s+bị\s+bỏ\s+rơi\b/i,
]);

const CAUSAL = fixViBoundaries([
  /\bgây\s+ra\s+việc\s+bạn\b/i,
  /\blà\s+nguyên\s+nhân\s+khiến\s+bạn\b/i,
  /\bkhiến\s+bạn\s+trở\s+thành\b/i,
  /\bxuất\s+phát\s+từ\s+tuổi\s+thơ\b/i,
]);

const CERTAINTY = fixViBoundaries([
  /\bchắc\s+chắn\s+(là|bạn)\b/i,
  /\brõ\s+ràng\s+bạn\b/i,
  /\b100%\b/i,
  /\bđiều\s+này\s+chứng\s+minh\b/i,
  /\bkhông\s+thể\s+nghi\s+ngờ\b/i,
]);

const DEPENDENCY = fixViBoundaries([
  /\btôi\s+luôn\s+ở\s+đây\s+với\s+bạn\b/i,
  /\bchỉ\s+cần\s+có\s+tôi\b/i,
  /\bbạn\s+chỉ\s+cần\s+kể\s+cho\s+tôi\b/i,
  /\btôi\s+hiểu\s+bạn\s+hơn\s+bất\s+kỳ\s+ai\b/i,
  /\bbạn\s+không\s+cần\s+ai\s+khác\b/i,
]);

export function detectAdvice(text: string): DetectionResult {
  return scan(text, ADVICE);
}

export function detectDiagnosis(text: string): DetectionResult {
  if (DIAGNOSIS_SAFE.some((re) => re.test(text))) {
    // If only safe hedges, check residual hard diagnosis without hedge
    const hard = scan(text, [
      /\bbạn\s+bị\s+(PTSD|ADHD|borderline)\b/i,
      /\bbạn\s+mắc\s+rối\s+loạn\b/i,
    ]);
    return hard;
  }
  return scan(text, DIAGNOSIS);
}

export function detectMindReading(text: string): DetectionResult {
  return scan(text, MIND_READ);
}

export function detectChildhoodOverreach(text: string): DetectionResult {
  return scan(text, CHILDHOOD);
}

export function detectCausalOverreach(text: string): DetectionResult {
  return scan(text, CAUSAL);
}

export function detectUnsupportedCertainty(text: string): DetectionResult {
  return scan(text, CERTAINTY);
}

export function detectEmotionalDependency(text: string): DetectionResult {
  return scan(text, DEPENDENCY);
}

export function detectAllForbidden(text: string): {
  ok: boolean;
  violations: string[];
} {
  const checks: Array<[string, DetectionResult]> = [
    ["advice", detectAdvice(text)],
    ["diagnosis", detectDiagnosis(text)],
    ["mind_reading", detectMindReading(text)],
    ["childhood", detectChildhoodOverreach(text)],
    ["causal", detectCausalOverreach(text)],
    ["certainty", detectUnsupportedCertainty(text)],
    ["dependency", detectEmotionalDependency(text)],
  ];
  const violations: string[] = [];
  for (const [name, r] of checks) {
    if (r.detected) violations.push(`${name}:${r.matches.join("|")}`);
  }
  return { ok: violations.length === 0, violations };
}
