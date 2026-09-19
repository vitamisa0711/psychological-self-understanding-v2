import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import {
  loadVerifiedConcepts,
  validateConcept,
  KnowledgeLoadError,
} from "@/lib/knowledge/loader";
import { knowledgeConceptSchema } from "@/lib/knowledge/schema";

const CONCEPTS_DIR = path.join(process.cwd(), "knowledge", "concepts");

describe("Knowledge loader", () => {
  it("TEST 6 — VERIFIED concepts are loaded", () => {
    const { concepts, meta } = loadVerifiedConcepts(CONCEPTS_DIR);
    expect(concepts.length).toBeGreaterThanOrEqual(15);
    expect(meta.knowledge_version).toBeTruthy();
    expect(concepts.every((c) => c.status === "VERIFIED")).toBe(true);
  });

  it("TEST 7/8/9/18 — non-VERIFIED excluded from runtime", () => {
    const { concepts, rejected } = loadVerifiedConcepts(CONCEPTS_DIR);
    expect(concepts.find((c) => c.status === "DRAFT")).toBeUndefined();
    expect(concepts.find((c) => c.status === "REVIEW")).toBeUndefined();
    expect(concepts.find((c) => c.status === "REJECTED")).toBeUndefined();
    // draft file should appear in rejected reasons
    const draftReject = rejected.find((r) => r.reason.includes("DRAFT"));
    expect(draftReject).toBeTruthy();
  });

  it("TEST 10 — malformed JSON fails loud", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kb-"));
    fs.writeFileSync(path.join(tmp, "bad.json"), "{ not json");
    expect(() => loadVerifiedConcepts(tmp)).toThrow(KnowledgeLoadError);
  });

  it("TEST 11 — when_not_to_infer preserved", () => {
    const { concepts } = loadVerifiedConcepts(CONCEPTS_DIR);
    for (const c of concepts) {
      expect(c.when_not_to_infer.length).toBeGreaterThan(0);
    }
  });

  it("invalid concept fails validation", () => {
    expect(() =>
      validateConcept({ concept_id: "x", status: "VERIFIED" })
    ).toThrow(KnowledgeLoadError);
  });
});
