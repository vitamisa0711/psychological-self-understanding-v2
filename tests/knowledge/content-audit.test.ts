import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  auditAdviceLanguage,
  auditDiagnosticLanguage,
} from "@/lib/knowledge/content-audit";
import { auditKnowledgeDirectory } from "@/lib/knowledge/integrity";

const CONCEPTS_DIR = path.join(process.cwd(), "knowledge", "concepts");

describe("Knowledge content audit", () => {
  const files = fs
    .readdirSync(CONCEPTS_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"));

  it("no advice language in production concepts", () => {
    for (const file of files) {
      const data = JSON.parse(
        fs.readFileSync(path.join(CONCEPTS_DIR, file), "utf-8")
      );
      const hits = auditAdviceLanguage(data);
      expect(hits, file).toEqual([]);
    }
  });

  it("no diagnostic language in production concepts", () => {
    for (const file of files) {
      const data = JSON.parse(
        fs.readFileSync(path.join(CONCEPTS_DIR, file), "utf-8")
      );
      const hits = auditDiagnosticLanguage(data);
      expect(hits, file).toEqual([]);
    }
  });

  it("detects advice language when present", () => {
    const hits = auditAdviceLanguage({ text: "Bạn nên nghỉ ngơi ngay." });
    expect(hits.length).toBeGreaterThan(0);
  });

  it("detects diagnostic language when present", () => {
    const hits = auditDiagnosticLanguage({ text: "Bạn bị rối loạn lo âu." });
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe("Knowledge directory integrity", () => {
  it("auditKnowledgeDirectory reports no hard errors for production set", () => {
    const report = auditKnowledgeDirectory(CONCEPTS_DIR);
    expect(report.verifiedCount).toBeGreaterThanOrEqual(15);
    // Draft file may exist; errors should only be for invalid production content
    const hard = report.errors.filter((e) => !e.includes("_draft"));
    expect(hard).toEqual([]);
  });
});
