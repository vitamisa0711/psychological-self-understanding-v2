import { describe, it, expect } from "vitest";
import { reason } from "@/lib/reasoning/engine";
import { buildEngineResult } from "@/lib/safety/decision";
import { VERSIONS } from "@/lib/config/versions";
import type { SafetyEngineResult } from "@/lib/safety/types";

function safetyLow(): SafetyEngineResult {
  return buildEngineResult({
    riskLevel: "LOW",
    signals: [],
    confidence: "MODERATE",
    classifierVersion: "test",
    safetyVersion: VERSIONS.safety,
  });
}

const FALLBACK_SUMMARY =
  "Formulation không đạt kiểm tra ngôn ngữ an toàn; chỉ giữ khung uncertainty.";

// Phase 14 regression test: this is the test that SHOULD have caught the
// unconditional-boilerplate-diagnosis-word bug. Unlike the pre-existing
// engine.test.ts, this checks the actual returned summary text for the
// safety-fallback marker directly, rather than only checking looser
// properties that also happen to hold true on the fallback path.
const SYNTHETIC_INPUTS = [
  "Người yêu tôi và tôi có xích mích và tôi khó chịu, anh ấy dù biết nhưng vẫn gửi tiktok cho tôi như không có gì xảy ra.",
  "Tôi buồn vì bị từ chối. Tôi kiểm tra tin nhắn nhiều lần.",
  "Sếp tôi phê bình tôi trước mặt đồng nghiệp và tôi thấy xấu hổ suốt cả ngày.",
  "Bạn thân của tôi hủy hẹn vào phút chót và tôi cảm thấy bị bỏ rơi.",
  "Tôi hay lo lắng khi người yêu không trả lời tin nhắn ngay lập tức.",
];

describe("Phase 14 — reasoning engine must not always fall back to the generic uncertainty placeholder", () => {
  it.each(SYNTHETIC_INPUTS)("does not trip its own language filter for: %s", (text) => {
    const f = reason({ user_text: text, safety: safetyLow() });
    expect(f.summary).not.toBe(FALLBACK_SUMMARY);
    expect(f.summary).not.toMatch(/không đạt kiểm tra ngôn ngữ an toàn/);
  });
});
