/**
 * Vitest setup — Phase 0
 */

// Ensure env defaults for tests
// NODE_ENV is typed readonly (by Next.js global types); vitest already sets
// it to "test" at process start, so we only need to ensure it here defensively.
if (process.env.NODE_ENV !== "test") {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
process.env.AI_PROVIDER = "mock";
