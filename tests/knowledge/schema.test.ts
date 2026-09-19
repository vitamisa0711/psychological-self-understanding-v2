import { describe, it, expect } from "vitest";
import { knowledgeConceptSchema, knowledgeSourceSchema, evidenceRecordSchema } from "@/lib/knowledge/schema";
import fs from "fs";
import path from "path";

const sampleValid = {
  concept_id: "test-concept",
  name_vi: "Khái niệm test",
  name_en: "Test Concept",
  domain: "test",
  definition: "Định nghĩa test đủ dài.",
  mechanism: ["Cơ chế 1"],
  common_triggers: ["t1"],
  associated_thoughts: ["th1"],
  associated_emotions: ["e1"],
  associated_behaviors: ["b1"],
  maintaining_factors: ["m1"],
  protective_factors: ["p1"],
  related_concepts: [],
  alternative_explanations: ["alt1"],
  misconceptions: ["mis1"],
  limitations: ["lim1"],
  evidence_strength: "MODERATE",
  clinical_or_nonclinical: "NON_CLINICAL",
  when_not_to_infer: ["Không suy luận khi thiếu dữ liệu"],
  evidence: [
    {
      evidence_id: "ev-1",
      claim: "Claim test",
      evidence_strength: "MODERATE",
      source_ids: ["src-1"],
      limitations: ["lim"],
    },
  ],
  sources: [
    {
      source_id: "src-1",
      title: "Real Textbook Title",
      year: 2000,
      source_type: "TEXTBOOK",
    },
  ],
  status: "VERIFIED",
  version: "1.0.0",
  last_reviewed: "2026-09-15",
};

describe("Knowledge schema validation", () => {
  it("TEST 1 — valid concept PASS", () => {
    const r = knowledgeConceptSchema.safeParse(sampleValid);
    expect(r.success).toBe(true);
  });

  it("TEST 2 — missing required field FAIL", () => {
    const { definition, ...bad } = sampleValid;
    expect(knowledgeConceptSchema.safeParse(bad).success).toBe(false);
  });

  it("TEST 3 — invalid status enum FAIL", () => {
    expect(
      knowledgeConceptSchema.safeParse({ ...sampleValid, status: "APPROVED" }).success
    ).toBe(false);
  });

  it("TEST 4 — invalid source FAIL", () => {
    expect(
      knowledgeSourceSchema.safeParse({ title: "No id", year: 2020 }).success
    ).toBe(false);
  });

  it("TEST 5 — evidence without source_ids FAIL", () => {
    expect(
      evidenceRecordSchema.safeParse({
        evidence_id: "e",
        claim: "c",
        evidence_strength: "LOW",
        limitations: [],
      }).success
    ).toBe(false);
  });

  it("TEST 12 — evidence referencing missing source FAIL", () => {
    const bad = {
      ...sampleValid,
      evidence: [
        {
          evidence_id: "ev-x",
          claim: "c",
          evidence_strength: "MODERATE",
          source_ids: ["nonexistent-source"],
          limitations: [],
        },
      ],
    };
    expect(knowledgeConceptSchema.safeParse(bad).success).toBe(false);
  });

  it("TEST 13 — version required", () => {
    const { version, ...bad } = sampleValid;
    expect(knowledgeConceptSchema.safeParse(bad).success).toBe(false);
  });

  it("TEST 14 — last_reviewed format", () => {
    expect(
      knowledgeConceptSchema.safeParse({
        ...sampleValid,
        last_reviewed: "15/09/2026",
      }).success
    ).toBe(false);
  });

  it("TEST 17 — unknown field rejected (.strict)", () => {
    expect(
      knowledgeConceptSchema.safeParse({
        ...sampleValid,
        diagnosis: "something",
      }).success
    ).toBe(false);
  });

  it("TEST 11 — when_not_to_infer required non-empty", () => {
    expect(
      knowledgeConceptSchema.safeParse({
        ...sampleValid,
        when_not_to_infer: [],
      }).success
    ).toBe(false);
  });
});
