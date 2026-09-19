import { describe, it, expect } from "vitest";
import { detectSafetyRules } from "@/lib/safety/rules";

const vi = (text: string) => ({ text, language: "vi" as const });

describe("Rule-based safety detection", () => {
  it("TEST 1 — normal LOW", () => {
    const r = detectSafetyRules(vi("Hôm nay tôi hơi buồn vì công việc không suôn sẻ."));
    expect(r.riskLevel).toBe("LOW");
  });

  it("TEST 14 — figurative chết vì nhớ → not CRITICAL", () => {
    const r = detectSafetyRules(vi("Tôi chết vì nhớ người yêu."));
    expect(r.riskLevel).not.toBe("CRITICAL");
    expect(r.riskLevel).not.toBe("HIGH");
  });

  it("false positive — deadline giết tôi", () => {
    const r = detectSafetyRules(vi("Deadline giết tôi tuần này."));
    expect(["LOW", "MODERATE"]).toContain(r.riskLevel);
  });

  it("false positive — phát điên vì bài", () => {
    const r = detectSafetyRules(vi("Điên mất vì bài này."));
    expect(["LOW", "MODERATE"]).toContain(r.riskLevel);
  });

  it("TEST 15 — emotional intensity only", () => {
    const r = detectSafetyRules(vi("Tôi buồn khủng khiếp."));
    expect(r.riskLevel).not.toBe("HIGH");
    expect(r.riskLevel).not.toBe("CRITICAL");
  });

  it("TEST 3 — explicit suicidal ideation", () => {
    const r = detectSafetyRules(vi("Tôi đang định tự sát."));
    expect(["HIGH", "CRITICAL"]).toContain(r.riskLevel);
  });

  it("TEST 3b — prepared suicide", () => {
    const r = detectSafetyRules(vi("Tôi đã chuẩn bị để tự sát."));
    expect(["HIGH", "CRITICAL"]).toContain(r.riskLevel);
  });

  it("TEST 4 — explicit self-harm", () => {
    const r = detectSafetyRules(vi("Tôi đang tự làm đau mình."));
    expect(["HIGH", "CRITICAL"]).toContain(r.riskLevel);
  });

  it("TEST 5 — immediate danger", () => {
    const r = detectSafetyRules(vi("Người đó đang đánh tôi ngay bây giờ."));
    expect(["HIGH", "CRITICAL"]).toContain(r.riskLevel);
  });

  it("TEST 9 — child unsafe", () => {
    const r = detectSafetyRules(vi("Đứa trẻ đang ở trong tình trạng nguy hiểm."));
    expect(["HIGH", "CRITICAL"]).toContain(r.riskLevel);
  });

  it("TEST 16 — muốn biến mất not automatic CRITICAL", () => {
    const r = detectSafetyRules(vi("Tôi muốn biến mất."));
    expect(r.riskLevel).not.toBe("CRITICAL");
  });
});
