/**
 * Knowledge Base + Evidence types
 * LOCKED SPECIFICATION v1.0.0
 * Only status === "VERIFIED" concepts may be used in production reasoning.
 */

import { ConfidenceLevel } from "./information";

export type ConceptStatus = "DRAFT" | "UNDER_REVIEW" | "VERIFIED" | "DEPRECATED" | "BLOCKED";
export type ClinicalFlag = "nonclinical" | "clinical_boundary" | "clinical";
export type EvidenceStrength = ConfidenceLevel;
export type CausalStatus =
  | "association"
  | "correlation"
  | "prediction"
  | "causal_evidence"
  | "unknown";
export type CulturalRelevance =
  | "GENERALIZABLE"
  | "PARTIALLY_GENERALIZABLE"
  | "CULTURALLY_DEPENDENT"
  | "UNKNOWN";
export type ClaimStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "LIMITED"
  | "CONFLICTING"
  | "UNSUPPORTED"
  | "BLOCKED";
export type SourceType =
  | "systematic_review"
  | "meta_analysis"
  | "rct"
  | "longitudinal"
  | "guideline"
  | "textbook"
  | "other";
export type VerificationStatus = "VERIFIED" | "UNVERIFIED" | "FABRICATED_BLOCKED";

export interface PsychologicalConcept {
  concept_id: string;
  name_en: string;
  name_vi: string;
  domain: string;
  subcategory?: string;
  definition: string;
  mechanism: string;
  common_triggers: string[];
  associated_thoughts: string[];
  associated_emotions: string[];
  associated_behaviors: string[];
  maintaining_factors: string[];
  protective_factors: string[];
  related_concepts: string[];
  alternative_explanations: string[];
  misconceptions: string[];
  limitations: string[];
  evidence_strength: EvidenceStrength;
  clinical_or_nonclinical: ClinicalFlag;
  when_not_to_infer: string[];
  sources: string[]; // source_id[]
  status: ConceptStatus;
  version: string;
  last_reviewed: string;
}

export interface Source {
  source_id: string;
  title: string;
  authors: string[];
  year: number;
  source_type: SourceType;
  journal_or_organization?: string;
  doi?: string;
  population?: string;
  country_or_region?: string;
  limitations: string[];
  verification_status: VerificationStatus;
}

export interface EvidenceRecord {
  evidence_id: string;
  claim_id: string;
  concept_id: string;
  claim_text: string;
  source_id: string;
  study_design: string;
  main_finding: string;
  causal_status: CausalStatus;
  evidence_strength: EvidenceStrength;
  cultural_relevance: CulturalRelevance;
  last_reviewed: string;
}

export interface Claim {
  claim_id: string;
  concept_id: string;
  claim_text: string;
  claim_type: "empirical" | "theoretical" | "individual_hypothesis";
  evidence_ids: string[];
  status: ClaimStatus;
}
