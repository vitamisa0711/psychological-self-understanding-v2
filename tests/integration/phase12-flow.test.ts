import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase 12 integration contracts", () => {
  it("analyze client exists and does not set safety fields", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/api/analyze-client.ts"),
      "utf-8"
    );
    expect(src).toMatch(/postAnalyze/);
    expect(src).not.toMatch(/riskLevel/);
    expect(src).not.toMatch(/allowReasoning/);
  });

  it("chat page uses /api/chat and /api/session bootstrap", () => {
    // V2: /analyze is now the chat page (replaced V1 form UI per Phase 15 spec)
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/app/analyze/page.tsx"),
      "utf-8"
    );
    // V2 chat page must call /api/chat (not /api/analyze directly)
    expect(src).toMatch(/\/api\/chat/);
    // Session bootstrap still required
    expect(src).toMatch(/\/api\/session/);
    // Chat sends `message` field, not V1 `text` field
    expect(src).toMatch(/message/);
  });

  it("session route sets HttpOnly cookie", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/session/route.ts"),
      "utf-8"
    );
    expect(src).toMatch(/httpOnly:\s*true/);
    expect(src).toMatch(/createSessionCookieValue/);
  });

  it("api analyze prefers cookie session and does not itself call generateControlled", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/analyze/route.ts"),
      "utf-8"
    );
    expect(src).toMatch(/parseSessionCookieValue/);
    // Phase 13 fix (S2): the route must NOT import/call generateControlled
    // directly — the pipeline (product-safety-gate.ts) owns the single
    // generation call. A duplicate call site in the route was the Phase 12
    // bug this test previously (incorrectly) required.
    expect(src).not.toMatch(/generateControlled/);
  });

  it("product safety gate owns the single generateControlled call site", () => {
    const src = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/lib/pipeline/product-safety-gate.ts"
      ),
      "utf-8"
    );
    // Count actual call expressions ("generateControlled(") rather than bare
    // textual occurrences of the identifier, so this test verifies the real
    // invariant (exactly one call site) without being tripped up by
    // explanatory comments or log strings that legitimately mention the
    // function by name elsewhere in the file.
    const callSites = src.split("generateControlled(").length - 1;
    expect(callSites).toBe(1);
    // Still confirm the import exists exactly once.
    const imports = (src.match(/import\s*\{\s*generateControlled\s*\}/g) ?? [])
      .length;
    expect(imports).toBe(1);
  });

  it("no service role in browser client", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/supabase/browser.ts"),
      "utf-8"
    );
    expect(src).not.toMatch(/SERVICE_ROLE/);
  });
});
