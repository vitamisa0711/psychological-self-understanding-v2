import { describe, it, expect } from "vitest";
import { psychologicalInputSchema } from "@/schemas/input";

describe("psychologicalInputSchema", () => {
  it("parses valid input", () => {
    const result = psychologicalInputSchema.safeParse({
      text: "Tôi cảm thấy rất buồn khi người yêu không trả lời tin nhắn.",
      language: "vi",
      maxLength: 4000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects too short text", () => {
    const result = psychologicalInputSchema.safeParse({
      text: "ngắn",
      language: "vi",
    });
    expect(result.success).toBe(false);
  });

  it("rejects extra fields because of .strict()", () => {
    const result = psychologicalInputSchema.safeParse({
      text: "Đây là một đoạn văn bản đủ dài để vượt qua validation tối thiểu.",
      language: "vi",
      advice: "bạn nên nghỉ ngơi",
    });
    expect(result.success).toBe(false);
  });
});
