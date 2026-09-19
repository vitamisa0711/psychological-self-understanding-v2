import { describe, it, expect } from "vitest";
import { hypothesisSchema } from "@/schemas/hypothesis";
import { ConfidenceLevel } from "@/types/information";

describe("hypothesisSchema", () => {
  it("parses valid hypothesis", () => {
    const result = hypothesisSchema.safeParse({
      id: "h1",
      title: "Nhạy cảm với sự từ chối",
      explanation: "Có điểm tương đồng với rejection sensitivity.",
      supportingEvidence: [],
      missingEvidence: ["pattern lặp lại"],
      contradictoryEvidence: [],
      alternativeExplanations: ["stress hiện tại"],
      confidence: ConfidenceLevel.LOW,
      whenNotToInfer: ["chỉ một lần"],
      clinicalBoundaryNote: "Không phải chẩn đoán",
    });
    expect(result.success).toBe(true);
  });

  it("rejects extra advice field", () => {
    const result = hypothesisSchema.safeParse({
      id: "h1",
      title: "Test",
      explanation: "Test",
      supportingEvidence: [],
      missingEvidence: [],
      contradictoryEvidence: [],
      alternativeExplanations: [],
      confidence: ConfidenceLevel.LOW,
      whenNotToInfer: [],
      advice: "bạn nên...",
    });
    expect(result.success).toBe(false);
  });
});
