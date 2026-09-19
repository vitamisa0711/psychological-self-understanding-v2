/**
 * Version configuration — LOCKED SPECIFICATION v1.0.0
 * All seven versions must be present on every analysis.
 * Bump manually when the corresponding layer changes.
 */

export const VERSIONS = {
  prompt: "prompt_v1.0.0",
  knowledge: "knowledge_v1.0.0",
  reasoning: "reasoning_v1.0.0",
  safety: "safety_v1.0.0",
  schema: "schema_v1.0.0",
  model: "model_v1.0.0",
  privacy_policy: "privacy_policy_v1.0.0",
} as const;

export type VersionKey = keyof typeof VERSIONS;

export function getAllVersions() {
  return { ...VERSIONS };
}
