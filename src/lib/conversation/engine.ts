/**
 * Conversation Engine — PHASE 15 / V2
 *
 * Orchestrates one turn of the multi-turn conversation:
 *   1. Detect signals from the user's message
 *   2. Decide next conversation state
 *   3. Build a prompt appropriate for that state
 *   4. Call the AI provider (via the existing generateControlled path for
 *      generation, or a direct chat completion for conversational response)
 *   5. Update memory
 *   6. Return the response
 *
 * SAFETY: the existing classifySafety() gate still runs on every user
 * message. HIGH/CRITICAL/UNCERTAIN → SAFETY_RESPONSE (no conversation).
 * The Conversation Engine only runs after LOW/MODERATE.
 */

import { detectSignals } from "./signal-detector";
import { nextState, shouldFormulate } from "./state-machine";
import { selectExplorationQuestion } from "./exploration-selector";
import type {
  ConversationEngineInput,
  ConversationEngineOutput,
  ConversationMemory,
  ConversationTurn,
  PartialHypothesis,
} from "./types";

// ─── Memory update ─────────────────────────────────────────────────────────

function updateMemory(
  memory: ConversationMemory,
  params: {
    userMessage: string;
    confirmedObservation?: string;
    deniedHypothesisLabel?: string;
    newHypothesis?: PartialHypothesis;
    questionKey?: string;
    emotions?: string[];
    trigger?: string;
    patternSignals: typeof memory.patternSignals;
    pastExperienceLevel: typeof memory.pastExperienceLevel;
    pastExperienceReported: boolean;
  }
): ConversationMemory {
  const updated: ConversationMemory = {
    ...memory,
    patternSignals: params.patternSignals,
    pastExperienceLevel: params.pastExperienceLevel,
    pastExperienceReported: params.pastExperienceReported,
  };

  if (params.confirmedObservation) {
    updated.confirmedObservations = [
      ...memory.confirmedObservations,
      params.confirmedObservation,
    ];
  }
  if (params.deniedHypothesisLabel) {
    updated.deniedHypotheses = [
      ...memory.deniedHypotheses,
      params.deniedHypothesisLabel,
    ];
    updated.activeHypotheses = memory.activeHypotheses.map((h) =>
      h.label === params.deniedHypothesisLabel ? { ...h, denied: true } : h
    );
  }
  if (params.newHypothesis) {
    const exists = memory.activeHypotheses.some(
      (h) => h.id === params.newHypothesis!.id
    );
    if (!exists) {
      updated.activeHypotheses = [...memory.activeHypotheses, params.newHypothesis];
    }
  }
  if (params.questionKey) {
    updated.questionsAsked = [...memory.questionsAsked, params.questionKey];
  }
  if (params.emotions) {
    const allEmotions = [...new Set([...memory.detectedEmotions, ...params.emotions])];
    updated.detectedEmotions = allEmotions;
  }
  if (params.trigger && !memory.coreTrigger) {
    updated.coreTrigger = params.trigger;
  }
  return updated;
}

// ─── Prompt builder for conversational turns ──────────────────────────────

function buildConversationalPrompt(
  userMessage: string,
  history: ConversationTurn[],
  memory: ConversationMemory,
  state: "VENTING" | "EXPLORATION" | "REFLECTION" | "FORMULATION" | "NO_FORMULATION_YET",
  explorationQuestion: { text: string; rationale: string } | null
): { system: string; messages: Array<{ role: string; content: string }> } {
  const systemParts: string[] = [
    `Bạn là một không gian tâm lý an toàn. Nhiệm vụ của bạn là giúp người dùng HIỂU RÕ HƠN điều đang xảy ra bên trong họ — không phải phân tích, không phải chẩn đoán, không phải đưa lời khuyên.

NGUYÊN TẮC TUYỆT ĐỐI:
- Không đưa lời khuyên ("bạn nên", "hãy thử", "tốt nhất là")
- Không chẩn đoán ("bạn bị", "bạn có trauma", "bạn có attachment issue")
- Không đọc suy nghĩ người khác ("anh ấy không quan tâm bạn" — đây là giả định, không phải sự thật)
- Không tạo độ sâu giả tạo — nếu vấn đề đơn giản, giữ nó đơn giản
- Không tự động kết nối mọi thứ với tuổi thơ hay trauma
- Không biến correlation thành causation
- Phân biệt rõ observation (điều xảy ra) với interpretation (cách người dùng cảm nhận nó)`,
  ];

  // State-specific instructions
  if (state === "VENTING") {
    systemParts.push(`TRẠNG THÁI HIỆN TẠI: LẮNG NGHE
Người dùng đang muốn được nghe, không muốn bị phân tích.
- Phản chiếu lại những gì họ vừa kể bằng ngôn ngữ của họ
- Xác nhận trải nghiệm ("Nghe như...", "Có vẻ...")
- Mời họ kể thêm nếu phù hợp
- Không hỏi nhiều câu hỏi cùng lúc
- Không cố tìm nguyên nhân ngay
- Độ dài phản hồi: ngắn, ấm, chân thực`);
  } else if (state === "EXPLORATION" && explorationQuestion) {
    systemParts.push(`TRẠNG THÁI HIỆN TẠI: KHÁM PHÁ
Bạn cần đặt đúng MỘT CÂU HỎI được chọn sẵn bên dưới.
- Trước tiên phản chiếu ngắn gọn những gì người dùng vừa nói
- Sau đó tự nhiên dẫn đến câu hỏi
- Câu hỏi phải tự nhiên, không cứng nhắc

CÂU HỎI CẦN ĐẶT: "${explorationQuestion.text}"

Không được thêm câu hỏi khác. Không được hỏi leading question chứa giả thuyết sẵn.`);
  } else if (state === "REFLECTION") {
    systemParts.push(`TRẠNG THÁI HIỆN TẠI: PHẢN CHIẾU GIẢ THUYẾT
Bạn đang chia sẻ một quan sát tentative — không phải kết luận.
- Bắt đầu bằng "Mình đang để ý một điều..." hoặc "Có một điều mình muốn cùng bạn nhìn thử..."
- Đưa ra giả thuyết dưới dạng câu hỏi: "Điều này có đúng với bạn không?"
- Giả thuyết phải dựa trên những gì người dùng đã kể — không thêm giả định
- Nếu giả thuyết liên quan đến pattern: "Mình để ý rằng mỗi khi... bạn đều có cảm giác..."
- Kết thúc bằng câu hỏi mở để người dùng xác nhận hoặc sửa lại
- Người dùng có quyền nói "không hẳn" và mình sẽ cập nhật`);
  } else if (state === "FORMULATION") {
    systemParts.push(`TRẠNG THÁI HIỆN TẠI: TỔNG HỢP
Bạn đang chia sẻ bức tranh tổng thể dựa trên những gì đã được nói.
- Bắt đầu bằng việc tóm tắt những điều cốt lõi đã được làm rõ
- Đưa ra 2-3 giả thuyết có thể giải thích (không chọn một nguyên nhân duy nhất)
- Mỗi giả thuyết: "Một cách hiểu có thể là... Một khả năng khác là..."
- Nêu rõ điều còn chưa rõ, điều còn cần khám phá
- Kết thúc bằng điều người dùng đã nhìn thấy rõ hơn — không phải lời khuyên
- Không kết thúc bằng "bạn nên..." hay "hãy..."
- Giữ lại uncertainty — không giả vờ có câu trả lời dứt khoát`);
  } else {
    // NO_FORMULATION_YET
    systemParts.push(`TRẠNG THÁI HIỆN TẠI: CHƯA ĐỦ DỮ LIỆU
- Phản chiếu lại những gì đã được chia sẻ
- Nêu rõ đây là điều bình thường — không cần phải có câu trả lời ngay
- Có thể đặt một câu hỏi nhẹ nhàng nếu phù hợp
- Không ép phải tìm ra nguyên nhân`);
  }

  // Memory context
  if (memory.deniedHypotheses.length > 0) {
    systemParts.push(
      `LƯU Ý: Người dùng đã phủ nhận các giả thuyết sau — KHÔNG lặp lại:\n${memory.deniedHypotheses.join(", ")}`
    );
  }
  if (memory.questionsAsked.length > 0) {
    systemParts.push(
      `CÁC VẤN ĐỀ ĐÃ HỎI — KHÔNG HỎI LẠI:\n${memory.questionsAsked.join(", ")}`
    );
  }

  const system = systemParts.join("\n\n");

  // Build message history for the API
  const messages: Array<{ role: string; content: string }> = [];
  for (const turn of history.slice(-10)) {
    // Last 10 turns for context window management
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: "user", content: userMessage });

  return { system, messages };
}

// ─── Main engine function ──────────────────────────────────────────────────

export async function runConversationTurn(
  input: ConversationEngineInput
): Promise<ConversationEngineOutput> {
  const { userMessage, history, memory, currentState } = input;

  // 1. Detect signals
  const lastAssistantTurn =
    [...history].reverse().find((t) => t.role === "assistant") ?? null;
  const signals = detectSignals(userMessage, history, memory, lastAssistantTurn);

  // 2. Update memory with new signals
  let updatedMemory = updateMemory(memory, {
    userMessage,
    patternSignals: signals.patternSignals,
    pastExperienceLevel: signals.pastExperienceLevel,
    pastExperienceReported: signals.pastExperienceReported,
    confirmedObservation:
      signals.userSignal === "CONFIRMS_REFLECTION" && lastAssistantTurn
        ? lastAssistantTurn.content.slice(0, 120) // brief record
        : undefined,
    deniedHypothesisLabel:
      signals.userSignal === "DENIES_REFLECTION" &&
      memory.activeHypotheses.find((h) => !h.denied)
        ? memory.activeHypotheses.find((h) => !h.denied)!.label
        : undefined,
  });

  // 3. Decide next state
  const resolvedNextState = nextState({
    currentState,
    userSignal: signals.userSignal,
    patternSignals: signals.patternSignals,
    memory: updatedMemory,
    historyLength: history.length,
  });

  // 4. Select exploration question if needed
  let explorationQuestion = null;
  let questionKey: string | null = null;
  if (resolvedNextState === "EXPLORATION") {
    const hasEmotion =
      updatedMemory.detectedEmotions.length > 0 ||
      /buồn|tức|lo|sợ|xấu\s*hổ|ghen|cô\s*đơn|thất\s*vọng|hoảng/i.test(userMessage);
    const hasTrigger = updatedMemory.coreTrigger !== null;
    const hasThought =
      updatedMemory.confirmedObservations.length > 0 ||
      /nghĩ\s*rằng|nghĩ\s*là|cảm\s*thấy\s*như|như\s*là/i.test(userMessage);

    explorationQuestion = selectExplorationQuestion({
      memory: updatedMemory,
      patternSignals: signals.patternSignals,
      pastExperienceLevel: signals.pastExperienceLevel,
      hasEmotion,
      hasTrigger,
      hasThought,
    });

    if (explorationQuestion) {
      // Extract key from the question pool
      questionKey = explorationQuestion.rationale.includes("emotion")
        ? "emotion_felt"
        : explorationQuestion.rationale.includes("trigger")
          ? "trigger_event"
          : explorationQuestion.rationale.includes("thought")
            ? "inner_thought"
            : explorationQuestion.rationale.includes("repetition")
              ? "pattern_repetition"
              : explorationQuestion.rationale.includes("generalization")
                ? "pattern_generalization"
                : explorationQuestion.rationale.includes("unexplained")
                  ? "unexplained_reaction"
                  : explorationQuestion.rationale.includes("level 2") ||
                      explorationQuestion.rationale.includes("prior general")
                    ? "past_childhood"
                    : explorationQuestion.rationale.includes("level 1")
                      ? "past_similar_feeling"
                      : explorationQuestion.rationale.includes("denied")
                        ? "what_feels_closer"
                        : explorationQuestion.rationale.includes("need")
                          ? "unmet_need"
                          : "exploration";
      updatedMemory = updateMemory(updatedMemory, {
        userMessage,
        patternSignals: signals.patternSignals,
        pastExperienceLevel: signals.pastExperienceLevel,
        pastExperienceReported: signals.pastExperienceReported,
        questionKey: questionKey ?? undefined,
      });
    }
  }

  // 5. Build prompt and call AI
  const { system, messages } = buildConversationalPrompt(
    userMessage,
    history,
    updatedMemory,
    resolvedNextState,
    explorationQuestion
  );

  const response = await callConversationalAI(system, messages);

  // 6. Extract hypothesis if this was a REFLECTION turn
  let hypothesisOffered: string | null = null;
  if (resolvedNextState === "REFLECTION") {
    const match = response.match(/Mình\s+đang\s+để\s+ý\s+([^.!?]+)/);
    if (match) {
      hypothesisOffered = match[1].trim();
      const newHyp: PartialHypothesis = {
        id: `hyp_${Date.now()}`,
        label: hypothesisOffered.slice(0, 80),
        evidence: updatedMemory.confirmedObservations.slice(-2),
        confidence: "LOW",
        denied: false,
      };
      updatedMemory = updateMemory(updatedMemory, {
        userMessage,
        patternSignals: signals.patternSignals,
        pastExperienceLevel: signals.pastExperienceLevel,
        pastExperienceReported: signals.pastExperienceReported,
        newHypothesis: newHyp,
      });
    }
  }

  return {
    response,
    nextState: resolvedNextState,
    updatedMemory,
    questionAsked: explorationQuestion?.text ?? null,
    hypothesisOffered,
  };
}

// ─── AI call ───────────────────────────────────────────────────────────────

async function callConversationalAI(
  system: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (process.env.AI_PROVIDER === "mock" || process.env.NODE_ENV === "test") {
    return mockConversationalResponse(messages.at(-1)?.content ?? "");
  }

  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  if (!apiKey) throw new Error("AI_API_KEY missing");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0.7,
      messages: [{ role: "system", content: system }, ...messages],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

function mockConversationalResponse(userMessage: string): string {
  if (/tại\s*sao|không\s*hiểu/i.test(userMessage)) {
    return "Nghe như bạn đang muốn hiểu rõ hơn điều gì đang xảy ra với mình. Cảm giác đó khiến bạn khó chịu như thế nào?";
  }
  if (/buồn|tức|lo|sợ/i.test(userMessage)) {
    return "Nghe như bạn đang mang một cảm xúc khá nặng. Nếu bạn muốn, bạn có thể kể thêm chuyện gì đã xảy ra không?";
  }
  return "Mình đang nghe. Bạn có muốn kể thêm không?";
}
