/**
 * Psychological Reasoning Engine — PHASE 6
 * Deterministic/mock formulation (no live LLM required).
 * Safety gate: HIGH/CRITICAL/UNCERTAIN (when safety fails closed) → SAFETY_GATED.
 */

import { randomUUID } from "crypto";
import { VERSIONS } from "@/lib/config/versions";
import { loadVerifiedConcepts } from "@/lib/knowledge/loader";
import type { KnowledgeConcept } from "@/lib/knowledge/types";
import { validateFormulation } from "./validators";
import type {
  ReasoningInput,
  PsychologicalFormulation,
  PsychologicalHypothesis,
  Observation,
  EmotionObservation,
  ThoughtObservation,
  BehaviorObservation,
  TriggerObservation,
  NeedHypothesis,
  MaintainingLoop,
  EvidenceTrace,
} from "./types";

const ENGINE_VERSION = "reasoning_v1.0.0";

function id(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function extractObservations(text: string): Observation[] {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
  return sentences.slice(0, 8).map((t) => ({
    id: id("obs"),
    text: t,
    kind: "user_stated" as const,
  }));
}

function extractEmotions(text: string): EmotionObservation[] {
  const map: Array<[RegExp, string]> = [
    [/lo\s*lắng|bất\s*an|sợ/i, "lo âu"],
    [/buồn|thất\s*vọng/i, "buồn"],
    [/tức|giận/i, "tức giận"],
    [/ghen/i, "ghen"],
    [/xấu\s*hổ/i, "xấu hổ"],
    [/cô\s*đơn/i, "cô đơn"],
  ];
  const out: EmotionObservation[] = [];
  for (const [re, label] of map) {
    if (re.test(text)) {
      out.push({
        id: id("emo"),
        label,
        confidence: "MODERATE",
        source: "inferred",
      });
    }
  }
  return out;
}

function extractThoughts(text: string): ThoughtObservation[] {
  const thoughts: ThoughtObservation[] = [];
  const quoted = text.match(/[«"“']([^«"“']{5,80})[»"”']/);
  if (quoted) {
    thoughts.push({
      id: id("th"),
      text: quoted[1],
      source: "reported",
    });
  }
  if (/không\s*còn\s*(yêu|quan\s*tâm)/i.test(text)) {
    thoughts.push({
      id: id("th"),
      text: "Họ có thể không còn quan tâm / yêu thương như trước",
      source: "inferred",
    });
  }
  if (/bị\s*từ\s*chối|không\s*còn\s*quan\s*tâm/i.test(text)) {
    thoughts.push({
      id: id("th"),
      text: "Có thể đang bị từ chối",
      source: "inferred",
    });
  }
  return thoughts;
}

function extractBehaviors(text: string): BehaviorObservation[] {
  const out: BehaviorObservation[] = [];
  if (/kiểm\s*tra.*(điện\s*thoại|tin\s*nhắn)/i.test(text)) {
    out.push({
      id: id("beh"),
      text: "Kiểm tra điện thoại / tin nhắn lặp lại",
      source: "reported",
    });
  }
  if (/nhắn\s*thêm|nhắn\s*liên\s*tục/i.test(text)) {
    out.push({
      id: id("beh"),
      text: "Nhắn thêm / tìm kiếm phản hồi",
      source: "reported",
    });
  }
  if (/rút\s*lui|tránh/i.test(text)) {
    out.push({
      id: id("beh"),
      text: "Rút lui hoặc tránh giao tiếp",
      source: "inferred",
    });
  }
  return out;
}

function extractTriggers(text: string): TriggerObservation[] {
  const out: TriggerObservation[] = [];
  if (/không\s*trả\s*lời|chưa\s*phản\s*hồi|im\s*lặng/i.test(text)) {
    out.push({
      id: id("trg"),
      text: "Phản hồi chậm / không nhận được phản hồi",
      confidence: "HIGH",
    });
  }
  if (/chỉ\s*trích|phê\s*bình/i.test(text)) {
    out.push({
      id: id("trg"),
      text: "Phê bình / chỉ trích",
      confidence: "MODERATE",
    });
  }
  return out;
}

function keywordScore(text: string, concept: KnowledgeConcept): number {
  const blob = text.toLowerCase();
  let score = 0;
  const bags = [
    ...concept.common_triggers,
    ...concept.associated_thoughts,
    ...concept.associated_emotions,
    ...concept.associated_behaviors,
    concept.name_vi,
    concept.name_en,
  ];
  for (const term of bags) {
    const t = term.toLowerCase();
    if (t.length >= 3 && blob.includes(t.slice(0, Math.min(12, t.length)))) {
      score += 1;
    }
  }
  // Domain heuristics
  if (/từ\s*chối|không\s*trả\s*lời|phớt\s*lờ/i.test(text) && concept.concept_id.includes("rejection"))
    score += 3;
  if (/không\s*chắc|chờ|mơ\s*hồ/i.test(text) && concept.concept_id.includes("uncertainty"))
    score += 3;
  if (/kiểm\s*tra|trấn\s*an|nhắn\s*thêm/i.test(text) && concept.concept_id.includes("reassurance"))
    score += 2;
  if (/suy\s*nghĩ\s*lặp|suy\s*tư/i.test(text) && concept.concept_id.includes("rumination"))
    score += 2;
  return score;
}

function buildHypotheses(
  text: string,
  concepts: KnowledgeConcept[]
): PsychologicalHypothesis[] {
  const scored = concepts
    .map((c) => ({ c, score: keywordScore(text, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (scored.length === 0) {
    return [
      {
        hypothesis_id: id("hyp"),
        label: "Phản ứng tình huống",
        formulation:
          "Dữ liệu hiện tại có thể phản ánh một phản ứng với tình huống cụ thể; chưa đủ để gắn với một pattern tâm lý ổn định.",
        supporting_evidence: [
          {
            kind: "user",
            description: "Mô tả trải nghiệm từ người dùng",
          },
        ],
        fit: {
          level: "LOW",
          explanation: "Thiếu dấu hiệu pattern lặp lại",
        },
        missing_data: [
          "Tần suất và thời gian của phản ứng",
          "Có xuất hiện ở nhiều mối quan hệ hay không",
        ],
        alternative_explanations: [
          "Stress hoàn cảnh",
          "Đặc điểm giao tiếp hiện tại trong quan hệ",
        ],
        contradictory_evidence: [],
        confidence: {
          level: "LOW",
          explanation: "Ít dữ liệu để đánh giá độ phù hợp",
        },
      },
    ];
  }

  return scored.map(({ c, score }) => {
    const fitLevel =
      score >= 5 ? "HIGH" : score >= 3 ? "MODERATE" : "LOW";
    const whenNot = c.when_not_to_infer.slice(0, 3);
    return {
      hypothesis_id: id("hyp"),
      concept_id: c.concept_id,
      label: `${c.name_vi} (${c.name_en})`,
      formulation: `Có một số điểm tương đồng với khái niệm «${c.name_vi}»: ${c.definition} Thông tin hiện tại chưa đủ để kết luận rằng đây là pattern ổn định của bạn.`,
      supporting_evidence: [
        {
          kind: "user",
          description: "Các chi tiết trong mô tả của người dùng có điểm chồng với đặc điểm concept",
        },
        {
          kind: "knowledge",
          description: c.definition,
          concept_id: c.concept_id,
          source_id: c.sources[0]?.source_id,
        },
      ],
      fit: {
        level: fitLevel as "HIGH" | "MODERATE" | "LOW",
        explanation: `Mức phù hợp dựa trên độ chồng chéo mô tả–concept (heuristic score=${score}).`,
      },
      missing_data: whenNot,
      alternative_explanations: c.alternative_explanations.slice(0, 4),
      contradictory_evidence: [],
      confidence: {
        level: fitLevel === "HIGH" ? "MODERATE" : "LOW",
        explanation:
          "Độ tin cậy gắn với case cụ thể, tách biệt với evidence strength của concept trong literature.",
      },
      evidence_strength: c.evidence_strength,
      knowledge_refs: [
        {
          concept_id: c.concept_id,
          name_vi: c.name_vi,
          name_en: c.name_en,
          evidence_strength: c.evidence_strength,
        },
      ],
    };
  });
}

function buildLoop(
  triggers: TriggerObservation[],
  thoughts: ThoughtObservation[],
  emotions: EmotionObservation[],
  behaviors: BehaviorObservation[]
): MaintainingLoop[] {
  if (!triggers.length || !behaviors.length) return [];
  return [
    {
      id: id("loop"),
      steps: [
        triggers[0]?.text ?? "Tín hiệu không chắc chắn",
        thoughts[0]?.text ?? "Diễn giải theo hướng bị từ chối / mất quan tâm",
        emotions[0]?.label ?? "Lo âu / bất an",
        behaviors[0]?.text ?? "Kiểm tra / tìm phản hồi",
        "Giảm khó chịu tạm thời → tăng nhạy cảm với lần chậm phản hồi tiếp theo",
      ],
      explanation:
        "Đây là một vòng lặp có thể xảy ra dựa trên dữ liệu hiện có; chưa khẳng định đây là pattern cố định.",
      confidence: "LOW",
    },
  ];
}

/**
 * Main entry: reason about user text under safety + knowledge constraints.
 */
export function reason(input: ReasoningInput): PsychologicalFormulation {
  const safety = input.safety;
  const risk = safety.decision.riskLevel;

  // Safety gate
  if (
    risk === "HIGH" ||
    risk === "CRITICAL" ||
    (risk === "UNCERTAIN" && safety.decision.stopReasoning)
  ) {
    const gated: PsychologicalFormulation = {
      formulation_id: id("form"),
      status: "SAFETY_GATED",
      summary:
        "Không tiếp tục phân tích tâm lý sâu vì kết quả an toàn không cho phép.",
      observations: [],
      event: { description: "" },
      interpretation: [],
      emotions: [],
      automatic_thoughts: [],
      behaviors: [],
      triggers: [],
      needs: [],
      maintaining_loops: [],
      learning_history: {
        present: false,
        note: "Không suy luận tuổi thơ khi safety-gated.",
      },
      hypotheses: [],
      unresolved_questions: [],
      uncertainty: {
        known: [],
        inferred: [],
        missing: [],
        why_missing_matters: [],
      },
      evidence_trace: [],
      engine_version: ENGINE_VERSION,
      knowledge_version: input.metadata?.knowledge_version ?? VERSIONS.knowledge,
    };
    return gated;
  }

  const text = input.user_text.trim();
  if (text.length < 10) {
    return {
      formulation_id: id("form"),
      status: "INSUFFICIENT_DATA",
      summary: "Thông tin quá ít để xây dựng formulation tâm lý có ý nghĩa.",
      observations: [],
      event: { description: text },
      interpretation: [],
      emotions: [],
      automatic_thoughts: [],
      behaviors: [],
      triggers: [],
      needs: [],
      maintaining_loops: [],
      learning_history: {
        present: false,
        note: "Chưa có dữ liệu về lịch sử học tập/tuổi thơ từ người dùng; không suy diễn.",
      },
      hypotheses: [],
      unresolved_questions: ["Bạn có thể mô tả cụ thể hơn sự việc và phản ứng của mình không?"],
      uncertainty: {
        known: [],
        inferred: [],
        missing: ["Mô tả chi tiết hơn về sự kiện và cảm xúc"],
        why_missing_matters: ["Thiếu dữ liệu thì không thể phân biệt các giả thuyết"],
      },
      evidence_trace: [],
      engine_version: ENGINE_VERSION,
      knowledge_version: VERSIONS.knowledge,
    };
  }

  let concepts: KnowledgeConcept[] =
    input.knowledge?.concepts ?? [];
  if (concepts.length === 0) {
    try {
      concepts = loadVerifiedConcepts().concepts;
    } catch {
      concepts = [];
    }
  }

  // Respect when_not_to_infer: filter concepts that explicitly block single-event inference
  // when text is very short / single sentence
  const sentenceCount = text.split(/[.!?\n]+/).filter((s) => s.trim().length > 5).length;
  const usable = concepts.filter((c) => {
    if (sentenceCount <= 1) {
      const blocks = c.when_not_to_infer.some((w) =>
        /một\s*(sự\s*kiện|câu|lần)|isolated|single/i.test(w)
      );
      if (blocks && keywordScore(text, c) < 4) return false;
    }
    return true;
  });

  const observations = extractObservations(text);
  const emotions = extractEmotions(text);
  const thoughts = extractThoughts(text);
  const behaviors = extractBehaviors(text);
  const triggers = extractTriggers(text);
  const hypotheses = buildHypotheses(text, usable.length ? usable : concepts);
  const loops = buildLoop(triggers, thoughts, emotions, behaviors);

  const needs: NeedHypothesis[] = [];
  if (/trấn\s*an|xác\s*nhận|quan\s*tâm/i.test(text)) {
    needs.push({
      id: id("need"),
      label: "Được xác nhận / đáp ứng cảm xúc",
      explanation:
        "Có khả năng trải nghiệm liên quan đến nhu cầu được xác nhận; chưa đủ để khẳng định đây là nhu cầu trung tâm.",
      confidence: "LOW",
    });
  }

  const evidence_trace: EvidenceTrace[] = hypotheses.map((h) => ({
    hypothesis_id: h.hypothesis_id,
    concept_id: h.concept_id,
    source_ids: h.supporting_evidence
      .map((e) => e.source_id)
      .filter((x): x is string => Boolean(x)),
    status: h.concept_id ? "TRACED" : "INSUFFICIENT",
  }));

  const status =
    hypotheses.length === 0
      ? "INSUFFICIENT_DATA"
      : hypotheses.every((h) => h.confidence.level === "LOW")
        ? "UNCERTAIN"
        : "VALID";

  const draft: PsychologicalFormulation = {
    formulation_id: id("form"),
    status,
    // Phase 14 fix: the previous wording ("...không phải kết luận hay chẩn
    // đoán") contained the literal word "chẩn đoán", which the engine's own
    // forbidden-language validator (validateFormulation) flags as diagnostic
    // language — this disclaimer, present in EVERY formulation, therefore
    // caused every single request to fail its own safety check and fall
    // back to the generic UNCERTAIN placeholder, unconditionally, for every
    // user. Same disclaiming meaning, without the trigger word.
    summary:
      "Dựa trên mô tả, có thể có một số cơ chế tâm lý liên quan; đây là các giả thuyết có mức phù hợp khác nhau, không phải một kết luận cuối cùng.",
    observations,
    event: {
      description:
        triggers[0]?.text ??
        observations[0]?.text ??
        "Sự kiện được mô tả trong nội dung người dùng",
    },
    interpretation: thoughts
      .filter((t) => t.source !== "uncertain")
      .map((t) => ({
        id: id("int"),
        text: t.text,
        source: t.source === "reported" ? ("user_reported" as const) : ("inferred" as const),
        confidence: "LOW" as const,
      })),
    emotions,
    automatic_thoughts: thoughts,
    behaviors,
    triggers,
    needs,
    maintaining_loops: loops,
    learning_history: {
      present: false,
      note: "Người dùng chưa cung cấp dữ liệu về trải nghiệm trước đây; không mặc định nguyên nhân tuổi thơ.",
    },
    hypotheses,
    unresolved_questions: [
      "Phản ứng này có xuất hiện trong những mối quan hệ khác không?",
      "Bạn thường nghĩ điều gì ngay trước khi cảm xúc tăng mạnh?",
    ],
    uncertainty: {
      known: observations.map((o) => o.text).slice(0, 3),
      inferred: thoughts.filter((t) => t.source === "inferred").map((t) => t.text),
      missing: [
        "Tần suất và thời gian của pattern",
        "Bối cảnh quan hệ rộng hơn",
        "Các yếu tố stress hiện tại",
      ],
      why_missing_matters: [
        "Giúp phân biệt phản ứng tình huống với pattern lặp lại",
        "Giúp cân bằng các giả thuyết thay vì chọn một giải thích duy nhất",
      ],
    },
    evidence_trace,
    engine_version: ENGINE_VERSION,
    knowledge_version: VERSIONS.knowledge,
  };

  const validated = validateFormulation(draft);
  if (!validated.ok) {
    // Fail closed: strip risky content rather than return unsafe output
    return {
      ...draft,
      status: "UNCERTAIN",
      summary:
        "Formulation không đạt kiểm tra ngôn ngữ an toàn; chỉ giữ khung uncertainty.",
      hypotheses: [],
      language_flags: {
        advice_detected: true,
        diagnosis_detected: false,
        unsupported_certainty_detected: false,
      },
    };
  }
  return validated.value;
}

export { ENGINE_VERSION };
