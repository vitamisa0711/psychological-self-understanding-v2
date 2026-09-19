import { describe, it, expect } from "vitest";
import { VERSIONS, getAllVersions } from "@/lib/config/versions";

describe("versions", () => {
  it("contains all 7 required versions", () => {
    const v = getAllVersions();
    expect(v.prompt).toMatch(/^prompt_v/);
    expect(v.knowledge).toMatch(/^knowledge_v/);
    expect(v.reasoning).toMatch(/^reasoning_v/);
    expect(v.safety).toMatch(/^safety_v/);
    expect(v.schema).toMatch(/^schema_v/);
    expect(v.model).toMatch(/^model_v/);
    expect(v.privacy_policy).toMatch(/^privacy_policy_v/);
  });

  it("VERSIONS object is frozen in shape", () => {
    expect(Object.keys(VERSIONS)).toHaveLength(7);
  });
});
