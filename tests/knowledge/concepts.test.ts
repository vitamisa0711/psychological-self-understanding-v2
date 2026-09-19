import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import { knowledgeConceptSchema } from "@/lib/knowledge/schema";
import { loadVerifiedConcepts } from "@/lib/knowledge/loader";

const CONCEPTS_DIR = path.join(process.cwd(), "knowledge", "concepts");

describe("All initial concepts integrity", () => {
  const files = fs
    .readdirSync(CONCEPTS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  it("TEST 15 — all production concept files schema PASS", () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
    for (const file of files) {
      const raw = JSON.parse(
        fs.readFileSync(path.join(CONCEPTS_DIR, file), "utf-8")
      );
      const result = knowledgeConceptSchema.safeParse(raw);
      if (!result.success) {
        console.error(file, result.error.flatten());
      }
      expect(result.success).toBe(true);
    }
  });

  it("TEST 15 — evidence source traceability for all files", () => {
    for (const file of files) {
      const raw = JSON.parse(
        fs.readFileSync(path.join(CONCEPTS_DIR, file), "utf-8")
      );
      const sourceIds = new Set(raw.sources.map((s: { source_id: string }) => s.source_id));
      for (const ev of raw.evidence) {
        for (const sid of ev.source_ids) {
          expect(sourceIds.has(sid)).toBe(true);
        }
      }
    }
  });

  it("TEST 15 — when_not_to_infer, alternatives, limitations present", () => {
    for (const file of files) {
      const raw = JSON.parse(
        fs.readFileSync(path.join(CONCEPTS_DIR, file), "utf-8")
      );
      expect(raw.when_not_to_infer.length).toBeGreaterThan(0);
      expect(raw.alternative_explanations.length).toBeGreaterThan(0);
      expect(raw.limitations.length).toBeGreaterThan(0);
    }
  });

  it("TEST 16 — no diagnosis field in concepts", () => {
    for (const file of files) {
      const raw = JSON.parse(
        fs.readFileSync(path.join(CONCEPTS_DIR, file), "utf-8")
      );
      expect(raw).not.toHaveProperty("diagnosis");
      expect(raw).not.toHaveProperty("disorder");
      expect(raw).not.toHaveProperty("icd_code");
    }
  });

  it("loader returns only VERIFIED and count matches", () => {
    const { concepts } = loadVerifiedConcepts(CONCEPTS_DIR);
    expect(concepts.length).toBe(files.filter((f) => {
      const raw = JSON.parse(
        fs.readFileSync(path.join(CONCEPTS_DIR, f), "utf-8")
      );
      return raw.status === "VERIFIED";
    }).length);
  });

  it("no fabricated empty sources", () => {
    for (const file of files) {
      const raw = JSON.parse(
        fs.readFileSync(path.join(CONCEPTS_DIR, file), "utf-8")
      );
      for (const s of raw.sources) {
        expect(s.source_id).toBeTruthy();
        expect(s.title).toBeTruthy();
        expect(s.year).toBeGreaterThan(1800);
      }
    }
  });
});
