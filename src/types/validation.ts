/**
 * Output Validation contracts — LOCKED SPECIFICATION v1.0.0
 */

import { AnalysisOutput } from "./output";

export type ValidationAction = "PASS" | "REJECT" | "REWRITE" | "RETRY";

export interface ValidationResult {
  action: ValidationAction;
  reasons: string[];
  rewrittenOutput?: AnalysisOutput;
}

export interface SchemaValidator {
  validate(output: unknown): ValidationResult;
}

export interface SafetyValidator {
  validate(output: AnalysisOutput): ValidationResult;
}

export interface AdviceDetector {
  detect(output: AnalysisOutput): ValidationResult;
}

export interface DiagnosticDetector {
  detect(output: AnalysisOutput): ValidationResult;
}

export interface MindReadingDetector {
  detect(output: AnalysisOutput): ValidationResult;
}

export interface UnsupportedClaimDetector {
  detect(output: AnalysisOutput): ValidationResult;
}

export interface CertaintyValidator {
  validate(output: AnalysisOutput): ValidationResult;
}

export interface ValidationPipeline {
  run(output: AnalysisOutput): Promise<ValidationResult>;
}
