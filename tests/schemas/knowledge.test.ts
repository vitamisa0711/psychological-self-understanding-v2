import { describe, it, expect } from "vitest";
import { psychologicalConceptSchema } from "@/schemas/knowledge";
import { ConfidenceLevel } from "@/types/information";

describe("psychologicalConceptSchema", () => {
  it("parses a VERIFIED concept", () => {
    const result = psychologicalConceptSchema.safeParse({
      concept_id: "REL-001",
      name_en: "Rejection Sensitivity",
      name_vi: "Nhạy cảm với sự từ chối",
      domain: "relationships",
      definition: "Xu hướng kỳ vọng hoặc phản ứng mạnh với khả năng bị từ chối.",
      mechanism: "Kỳ vọng → chú ý tín hiệu mơ hồ → diễn giải tiêu cực.",
      common_triggers: ["không được trả lời"],
      associated_thoughts: ["Họ không quan tâm"],
      associated_emotions: ["lo âu"],
      associated_behaviors: ["kiểm tra điện thoại"],
      maintaining_factors: ["tìm kiếm sự trấn an"],
      protective_factors: [],
      related_concepts: [],
      alternative_explanations: ["bối cảnh quan hệ"],
      misconceptions: [],
      limitations: ["Không phải diagnosis"],
      evidence_strength: ConfidenceLevel.MODERATE,
      clinical_or_nonclinical: "nonclinical",
      when_not_to_infer: ["chỉ buồn sau một lần từ chối"],
      sources: ["src1"],
      status: "VERIFIED",
      version: "1.0.0",
      last_reviewed: "2026-09-01",
    });
    expect(result.success).toBe(true);
  });

  it("requires when_not_to_infer", () => {
    const result = psychologicalConceptSchema.safeParse({
      concept_id: "X",
      name_en: "X",
      name_vi: "X",
      domain: "x",
      definition: "x",
      mechanism: "x",
      common_triggers: [],
      associated_thoughts: [],
      associated_emotions: [],
      associated_behaviors: [],
      maintaining_factors: [],
      protective_factors: [],
      related_concepts: [],
      alternative_explanations: [],
      misconceptions: [],
      limitations: [],
      evidence_strength: ConfidenceLevel.LOW,
      clinical_or_nonclinical: "nonclinical",
      when_not_to_infer: [], // empty not allowed by .min(1)
      sources: [],
      status: "VERIFIED",
      version: "1.0.0",
      last_reviewed: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });
});
