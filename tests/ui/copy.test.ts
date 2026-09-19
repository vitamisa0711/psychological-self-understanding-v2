import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/** Static copy checks — no advice/diagnosis in UI strings */
describe("Phase 10 UI copy safety", () => {
  const roots = [
    path.join(process.cwd(), "src/app"),
    path.join(process.cwd(), "src/components"),
  ];

  function collectTsx(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const out: string[] = [];
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) out.push(...collectTsx(full));
      else if (name.endsWith(".tsx") || name.endsWith(".ts")) out.push(full);
    }
    return out;
  }

  const files = roots.flatMap(collectTsx);
  const blob = files.map((f) => fs.readFileSync(f, "utf-8")).join("\n");

  it("has Vietnamese home messaging", () => {
    expect(blob).toMatch(/Hiểu điều gì đang xảy ra/);
  });

  it("does not use diagnostic marketing copy", () => {
    expect(blob).not.toMatch(/AI therapist|AI bác sĩ|chữa bệnh/i);
  });

  it("mentions non-diagnostic boundary", () => {
    expect(blob).toMatch(/không phải công cụ chẩn đoán/i);
  });
});
