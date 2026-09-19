import { describe, it, expect } from "vitest";
import { analysisOutputSchema } from "@/schemas/output";
import { InformationType, ConfidenceLevel } from "@/types/information";
import { RiskLevel } from "@/types/safety";
import { VERSIONS } from "@/lib/config/versions";

const minimalValidOutput = {
  experience_summary: "Người dùng mô tả cảm giác buồn khi không nhận được phản hồi.",
  facts: [
    {
      id: "f1",
      text: "Người yêu không trả lời tin nhắn trong vài giờ.",
      type: InformationType.USER_FACT,
      confidence: ConfidenceLevel.HIGH,
    },
  ],
  interpretations: [],
  emotions: [],
  automatic_thoughts: [],
  behaviors: [],
  triggers: [],
  possible_needs: [],
  maintaining_patterns: [],
  past_experiences: [],
  psychological_concepts: [],
  hypotheses: [
    {
      id: "h1",
      title: "Phản ứng với sự không chắc chắn",
      explanation: "Có thể liên quan đến khó chịu với sự không chắc chắn.",
      supportingEvidence: [],
      missingEvidence: ["pattern lặp lại"],
      contradictoryEvidence: [],
      alternativeExplanations: ["bối cảnh quan hệ hiện tại"],
      confidence: ConfidenceLevel.LOW,
      whenNotToInfer: ["chỉ một lần duy nhất"],
    },
  ],
  uncertainty: {
    overall: ConfidenceLevel.LOW,
    missingInformation: ["tần suất", "bối cảnh rộng hơn"],
    openQuestions: ["Phản ứng này có lặp lại không?"],
  },
  reflective_questions: ["Phần nào trong tình huống này khiến bạn khó chịu nhất?"],
  versions: { ...VERSIONS },
  safety_level: RiskLevel.LOW,
};

describe("analysisOutputSchema", () => {
  it("parses minimal valid output", () => {
    const result = analysisOutputSchema.safeParse(minimalValidOutput);
    expect(result.success).toBe(true);
  });

  it("rejects forbidden fields via .strict()", () => {
    const bad = {
      ...minimalValidOutput,
      recommendation: "Bạn nên nói chuyện với người đó",
    };
    const result = analysisOutputSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects missing required versions", () => {
    const bad = {
      ...minimalValidOutput,
      versions: {
        prompt: "prompt_v1.0.0",
        // missing others
      },
    };
    const result = analysisOutputSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
