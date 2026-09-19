import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase 11 persistence contracts", () => {
  const migration = fs.readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260918000005_phase11_persistence.sql"
    ),
    "utf-8"
  );

  it("creates profiles, messages, model_runs", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.profiles/);
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.messages/);
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.model_runs/);
  });

  it("enables RLS on new tables", () => {
    expect(migration).toMatch(/ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/ALTER TABLE public\.messages ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(/ALTER TABLE public\.model_runs ENABLE ROW LEVEL SECURITY/);
  });

  it("messages role constrained", () => {
    expect(migration).toMatch(/role IN \('user', 'assistant', 'system'\)/);
  });

  it("model_runs has no raw content columns", () => {
    expect(migration).not.toMatch(/raw_prompt/);
    expect(migration).not.toMatch(/raw_response/);
  });

  it("persistence modules exist", () => {
    const base = path.join(process.cwd(), "src/lib/db/persistence");
    for (const f of [
      "analyses.ts",
      "messages.ts",
      "model-runs.ts",
      "safety-events.ts",
      "index.ts",
    ]) {
      expect(fs.existsSync(path.join(base, f))).toBe(true);
    }
  });

  it("browser client does not reference service role", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/supabase/browser.ts"),
      "utf-8"
    );
    expect(src).not.toMatch(/SERVICE_ROLE/);
    expect(src).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("api route strips client userId authority pattern", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/analyze/route.ts"),
      "utf-8"
    );
    expect(src).toMatch(/Strip client-forged|Ignore any client-forged|forged/i);
    expect(src).not.toMatch(/body\.userId/);
  });
});
