# Knowledge Base

**Version:** `knowledge_v1.0.0`  
**Phase:** 5 (Evidence Layer on Phase 2 foundation)

## Purpose

Cung cấp kiến thức tâm lý có cấu trúc, có nguồn, có giới hạn suy luận cho reasoning engine (phase sau).

**Không** phải: advice engine, diagnosis engine, coaching, decision-making thay user.

Triết lý sản phẩm: *“Không nói bạn phải làm gì. Giúp bạn hiểu điều gì đang xảy ra bên trong mình.”*

## Architecture

```
knowledge/concepts/*.json
        ↓
Zod schema (.strict)
        ↓
Integrity + content audit
        ↓
Loader → only status === "VERIFIED"
        ↓
Runtime Knowledge Base
```

## Schema (concept)

Required fields include: `concept_id`, `name_vi`, `name_en`, `domain`, `definition`, `mechanism[]`, triggers/thoughts/emotions/behaviors, `maintaining_factors`, `protective_factors`, `related_concepts`, `alternative_explanations`, `misconceptions`, `limitations`, `evidence_strength`, `clinical_or_nonclinical`, **`when_not_to_infer`**, `evidence[]`, `sources[]`, `status`, `version`, `last_reviewed`.

## Evidence hierarchy

1. Systematic reviews  
2. Meta-analyses  
3. Clinical guidelines  
4. Peer-reviewed research  
5. Academic textbooks  
6. Professional organizations  

No TikTok/Facebook/Reddit/AI-only blogs as evidence foundation.

## Evidence strength

`VERY_STRONG | STRONG | MODERATE | LIMITED | INSUFFICIENT`

Mô tả chất lượng evidence của **concept**, không phải confidence rằng user “có” concept đó.

## Clinical boundary

| Layer | Allowed |
|-------|---------|
| Observation | Có |
| Psychological formulation / hypothesis | Có (thận trọng) |
| Clinical diagnosis | **Không** trong runtime KB claims |

## Writing rules

- Luôn có `when_not_to_infer`
- Luôn có `alternative_explanations` và `limitations`
- Không advice (“bạn nên…”)
- Không diagnosis (“bạn bị…”)
- Không bịa DOI/paper
- Không mặc định childhood trauma
- English term + bản dịch tiếng Việt rõ ràng

## Loader rule

Chỉ `status === "VERIFIED"` vào runtime. Schema valid ≠ scientifically verified.

## Versioning

- Global: `KNOWLEDGE_BASE_VERSION` / `VERSIONS.knowledge`
- Per concept: `version`, `last_reviewed` (YYYY-MM-DD)

## Tests

- `tests/knowledge/schema.test.ts`
- `tests/knowledge/loader.test.ts`
- `tests/knowledge/concepts.test.ts`
- `tests/knowledge/content-audit.test.ts`

## Out of scope (later phases)

- RAG / embeddings / vector DB  
- Live LLM retrieval  
- Frontend  
