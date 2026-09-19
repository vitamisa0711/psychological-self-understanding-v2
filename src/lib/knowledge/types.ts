/**
 * Knowledge Base types — PHASE 2
 * LOCKED SPECIFICATION v1.0.0
 * Only status === "VERIFIED" concepts enter runtime KB.
 */

export type KnowledgeStatus = "DRAFT" | "REVIEW" | "VERIFIED" | "REJECTED";

export type EvidenceStrength =
  | "VERY_STRONG"
  | "STRONG"
  | "MODERATE"
  | "LIMITED"
  | "INSUFFICIENT";

export type ClinicalScope = "NON_CLINICAL" | "CLINICAL_RELEVANT" | "MIXED";

export type SourceType =
  | "SYSTEMATIC_REVIEW"
  | "META_ANALYSIS"
  | "CLINICAL_GUIDELINE"
  | "PEER_REVIEWED"
  | "TEXTBOOK"
  | "PROFESSIONAL_ORGANIZATION"
  | "UNIVERSITY"
  | "GOVERNMENT"
  | "OTHER";

export interface KnowledgeSource {
  source_id: string;
  title: string;
  authors?: string[];
  year: number;
  source_type: SourceType;
  publisher?: string;
  journal?: string;
  doi?: string;
  url?: string;
}

export interface EvidenceRecord {
  evidence_id: string;
  claim: string;
  evidence_strength: EvidenceStrength;
  source_ids: string[];
  limitations: string[];
  notes?: string;
}

export interface KnowledgeConcept {
  concept_id: string;
  name_vi: string;
  name_en: string;
  domain: string;
  subcategory?: string;
  definition: string;
  mechanism: string[];
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
  clinical_or_nonclinical: ClinicalScope;
  when_not_to_infer: string[];
  evidence: EvidenceRecord[];
  sources: KnowledgeSource[];
  status: KnowledgeStatus;
  version: string;
  last_reviewed: string; // ISO date YYYY-MM-DD
}

export interface KnowledgeBaseMeta {
  knowledge_version: string;
  concept_count: number;
  loaded_at: string;
}
