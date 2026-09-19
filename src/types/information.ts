/**
 * Core information type system — LOCKED SPECIFICATION v1.0.0
 * Fact ≠ Interpretation ≠ AI Inference ≠ Hypothesis ≠ Unknown
 * Never promote a lower type to a higher certainty type.
 */

export enum InformationType {
  USER_FACT = "USER_FACT",
  USER_INTERPRETATION = "USER_INTERPRETATION",
  AI_INFERENCE = "AI_INFERENCE",
  HYPOTHESIS = "HYPOTHESIS",
  UNKNOWN = "UNKNOWN",
}

export enum ConfidenceLevel {
  HIGH = "HIGH",
  MODERATE = "MODERATE",
  LOW = "LOW",
  INSUFFICIENT = "INSUFFICIENT",
}
