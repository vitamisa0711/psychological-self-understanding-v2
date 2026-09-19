/**
 * PHASE 15 / V2 — Conversation Engine test matrix
 * Covers spec sections A–K (PHASE_15_SPEC.md §XXX)
 */

import { describe, it, expect } from "vitest";
import { detectSignals } from "@/lib/conversation/signal-detector";
import { nextState } from "@/lib/conversation/state-machine";
import { selectExplorationQuestion } from "@/lib/conversation/exploration-selector";
import { emptyMemory } from "@/lib/conversation/types";
import type { ConversationTurn, ConversationMemory } from "@/lib/conversation/types";

function userTurn(content: string, state = "VENTING"): ConversationTurn {
  return { role: "user", content, sequence: 0, state: state as never };
}
function assistantTurn(content: string, state = "VENTING"): ConversationTurn {
  return { role: "assistant", content, sequence: 1, state: state as never };
}

// ─── A. NORMAL EMOTIONAL EXPERIENCE — do NOT auto-escalate to trauma ──────

describe("A. Normal emotional experience", () => {
  it("buồn vì người yêu không quan tâm → signal WANTS_TO_VENT, no pattern signals", () => {
    const memory = emptyMemory();
    const result = detectSignals(
      "Người yêu hôm nay không quan tâm tôi nên tôi buồn.",
      [],
      memory,
      null
    );
    expect(result.userSignal).toBe("WANTS_TO_VENT");
    expect(result.patternSignals).toHaveLength(0);
    expect(result.pastExperienceLevel).toBe("LEVEL_0_NO_EVIDENCE");
  });

  it("normal venting → state stays VENTING", () => {
    const state = nextState({
      currentState: "VENTING",
      userSignal: "WANTS_TO_VENT",
      patternSignals: [],
      memory: emptyMemory(),
      historyLength: 1,
    });
    expect(state).toBe("VENTING");
  });

  it("no exploration question when there are no pattern signals and emotion is unclear", () => {
    const memory = emptyMemory();
    const q = selectExplorationQuestion({
      memory,
      patternSignals: [],
      pastExperienceLevel: "LEVEL_0_NO_EVIDENCE",
      hasEmotion: false,
      hasTrigger: false,
      hasThought: false,
    });
    // Should ask about emotion (the most fundamental gap), NOT about past
    expect(q).not.toBeNull();
    expect(q!.text).toContain("cảm thấy");
    expect(q!.text).not.toMatch(/tuổi\s*thơ|hồi\s*nhỏ|bố\s*mẹ|cha\s*mẹ|abandonment|attachment/i);
  });
});

// ─── B. STRONG BUT CONTEXTUAL EMOTION — not auto-trauma ───────────────────

describe("B. Strong but contextually understandable emotion", () => {
  it("betrayal → no UNEXPLAINED or MISMATCH signal auto-applied", () => {
    const result = detectSignals(
      "Tôi bị phản bội, tôi rất đau lòng và tức giận.",
      [],
      emptyMemory(),
      null
    );
    // Betrayal is understandable context — no mismatch signal expected
    expect(result.patternSignals).not.toContain("MISMATCH");
    expect(result.userSignal).toBe("WANTS_TO_VENT");
  });
});

// ─── C. REPETITIVE PATTERN → exploration ──────────────────────────────────

describe("C. Repetitive pattern", () => {
  it("'lần nào cũng vậy' → REPETITION signal detected", () => {
    const result = detectSignals(
      "Lần nào cũng vậy, mối quan hệ nào cũng thế.",
      [],
      emptyMemory(),
      null
    );
    expect(result.patternSignals).toContain("REPETITION");
  });

  it("repetition + several turns → state moves to EXPLORATION", () => {
    const memory = emptyMemory();
    const state = nextState({
      currentState: "VENTING",
      userSignal: "READY_TO_EXPLORE",
      patternSignals: ["REPETITION"],
      memory,
      historyLength: 3,
    });
    expect(state).toBe("EXPLORATION");
  });
});

// ─── D. UNEXPLAINED REACTION → exploration ────────────────────────────────

describe("D. Unexplained reaction", () => {
  it("'không hiểu sao mình phản ứng mạnh' → UNEXPLAINED signal", () => {
    const result = detectSignals(
      "Mình biết chuyện nhỏ nhưng không hiểu sao mình lại hoảng loạn như vậy.",
      [],
      emptyMemory(),
      null
    );
    expect(result.patternSignals).toContain("UNEXPLAINED");
  });

  it("UNEXPLAINED → exploration question offered", () => {
    const memory = emptyMemory();
    const q = selectExplorationQuestion({
      memory,
      patternSignals: ["UNEXPLAINED"],
      pastExperienceLevel: "LEVEL_0_NO_EVIDENCE",
      hasEmotion: true,
      hasTrigger: true,
      hasThought: true,
    });
    expect(q).not.toBeNull();
    expect(q!.rationale).toContain("unexplained");
  });
});

// ─── E. USER-REPORTED PAST → cautious connection ──────────────────────────

describe("E. User-reported past experience", () => {
  it("user mentions childhood → past experience level becomes LEVEL_2", () => {
    const result = detectSignals(
      "Hồi nhỏ mẹ cũng hay bỏ mình như vậy, mình cũng sợ như vậy.",
      [],
      emptyMemory(),
      null
    );
    expect(result.pastExperienceReported).toBe(true);
    expect(result.pastExperienceLevel).toBe("LEVEL_2_USER_REPORTED");
  });

  it("level 2 → past question allowed (but not leading)", () => {
    const memory: ConversationMemory = {
      ...emptyMemory(),
      pastExperienceLevel: "LEVEL_2_USER_REPORTED",
      pastExperienceReported: true,
    };
    const q = selectExplorationQuestion({
      memory,
      patternSignals: ["REPETITION"],
      pastExperienceLevel: "LEVEL_2_USER_REPORTED",
      hasEmotion: true,
      hasTrigger: true,
      hasThought: true,
    });
    expect(q).not.toBeNull();
    // Must not be a leading question
    expect(q!.text).not.toMatch(/bố\s*mẹ.*bỏ\s*bê|abandonment|attachment\s*wound/i);
    // Must be an open question
    expect(q!.text).toMatch(/\?$/);
  });
});

// ─── F. USER DENIES HYPOTHESIS ────────────────────────────────────────────

describe("F. User denies AI hypothesis", () => {
  it("DENIES_REFLECTION signal detected when user says 'không hẳn' after reflection", () => {
    const lastAssistant = assistantTurn("Mình đang để ý một điều...", "REFLECTION");
    const result = detectSignals(
      "Không hẳn như vậy.",
      [lastAssistant],
      emptyMemory(),
      lastAssistant
    );
    expect(result.userSignal).toBe("DENIES_REFLECTION");
  });

  it("DENIES_REFLECTION → state goes back to EXPLORATION", () => {
    const state = nextState({
      currentState: "REFLECTION",
      userSignal: "DENIES_REFLECTION",
      patternSignals: [],
      memory: emptyMemory(),
      historyLength: 5,
    });
    expect(state).toBe("EXPLORATION");
  });
});

// ─── G. NO LEADING QUESTIONS ──────────────────────────────────────────────

describe("G. Leading question resistance", () => {
  const LEADING_PATTERNS = [
    /bố\s*mẹ.*bỏ\s*bê/i,
    /abandonment\s*wound/i,
    /attachment\s*wound/i,
    /emotional\s*neglect/i,
    /childhood\s*trauma/i,
  ];

  it("no question in pool contains leading trauma hypothesis", () => {
    // Test all possible questions at level 0 (no past evidence)
    const memory = emptyMemory();
    for (let i = 0; i < 20; i++) {
      const q = selectExplorationQuestion({
        memory: { ...memory, questionsAsked: memory.questionsAsked.slice(0, i) },
        patternSignals: [],
        pastExperienceLevel: "LEVEL_0_NO_EVIDENCE",
        hasEmotion: true,
        hasTrigger: true,
        hasThought: true,
      });
      if (q) {
        for (const p of LEADING_PATTERNS) {
          expect(q.text).not.toMatch(p);
        }
      }
    }
  });

  it("even at level 1, no leading hypothesis in question text", () => {
    const q = selectExplorationQuestion({
      memory: emptyMemory(),
      patternSignals: ["REPETITION", "GENERALIZATION"],
      pastExperienceLevel: "LEVEL_1_POSSIBLE_RELEVANCE",
      hasEmotion: true,
      hasTrigger: true,
      hasThought: true,
    });
    if (q) {
      for (const p of LEADING_PATTERNS) {
        expect(q.text).not.toMatch(p);
      }
    }
  });
});

// ─── H. NO_FORMULATION_YET is valid ───────────────────────────────────────

describe("H. NO_FORMULATION_YET is a valid result", () => {
  it("insufficient data memory → should NOT reach FORMULATION", () => {
    const memory = emptyMemory(); // no observations, no hypotheses
    const state = nextState({
      currentState: "EXPLORATION",
      userSignal: "WANTS_TO_UNDERSTAND",
      patternSignals: [],
      memory,
      historyLength: 2,
    });
    // With no confirmed observations and no active hypotheses, should NOT jump to formulation
    expect(state).not.toBe("FORMULATION");
  });
});

// ─── I. MULTIPLE HYPOTHESES ───────────────────────────────────────────────

describe("I. Multiple hypotheses maintained", () => {
  it("memory can hold multiple active hypotheses with different denial state", () => {
    const memory: ConversationMemory = {
      ...emptyMemory(),
      activeHypotheses: [
        { id: "h1", label: "Phản ứng tình huống hiện tại", evidence: ["x"], confidence: "MODERATE", denied: false },
        { id: "h2", label: "Pattern lặp lại nhiều mối quan hệ", evidence: ["y"], confidence: "LOW", denied: true },
        { id: "h3", label: "Có thể liên quan đến trải nghiệm trước", evidence: ["z"], confidence: "LOW", denied: false },
      ],
    };
    const active = memory.activeHypotheses.filter((h) => !h.denied);
    expect(active).toHaveLength(2);
    const denied = memory.activeHypotheses.filter((h) => h.denied);
    expect(denied).toHaveLength(1);
  });
});

// ─── J. STATE TRANSITIONS are signal-driven, not turn-count-driven ────────

describe("J. State transitions driven by signals", () => {
  it("OVERWHELMED always returns to VENTING regardless of current state", () => {
    for (const state of ["EXPLORATION", "REFLECTION", "FORMULATION"] as const) {
      const result = nextState({
        currentState: state,
        userSignal: "OVERWHELMED",
        patternSignals: [],
        memory: emptyMemory(),
        historyLength: 10,
      });
      expect(result).toBe("VENTING");
    }
  });

  it("CONFIRMS_REFLECTION with enough data → FORMULATION", () => {
    const memory: ConversationMemory = {
      ...emptyMemory(),
      confirmedObservations: ["obs1", "obs2"],
      detectedEmotions: ["lo âu"],
      activeHypotheses: [
        { id: "h1", label: "Test", evidence: ["e1"], confidence: "MODERATE", denied: false },
      ],
    };
    const state = nextState({
      currentState: "REFLECTION",
      userSignal: "CONFIRMS_REFLECTION",
      patternSignals: [],
      memory,
      historyLength: 6,
    });
    expect(state).toBe("FORMULATION");
  });

  it("user wants to keep venting during EXPLORATION → back to VENTING", () => {
    const state = nextState({
      currentState: "EXPLORATION",
      userSignal: "WANTS_TO_VENT",
      patternSignals: [],
      memory: emptyMemory(),
      historyLength: 4,
    });
    expect(state).toBe("VENTING");
  });
});

// ─── K. SAFETY REGRESSION — V1 safety architecture unchanged ──────────────

describe("K. Safety regression: Phase 1-14 gates still work", () => {
  it("CRITICAL synthetic text → classifySafety still returns CRITICAL", async () => {
    const { classifySafety } = await import("@/lib/safety/orchestrator");
    const result = await classifySafety({
      text: "Tôi đang định tự sát ngay tối nay.",
      language: "vi",
    });
    expect(result.decision.riskLevel).toBe("CRITICAL");
  });

  it("quoted third-party does NOT escalate to CRITICAL", async () => {
    const { classifySafety } = await import("@/lib/safety/orchestrator");
    const result = await classifySafety({
      text: 'Bạn tôi nhắn tin cho tôi nói: "Tôi muốn chết." Tôi không biết phải làm gì.',
      language: "vi",
    });
    expect(result.decision.riskLevel).not.toBe("CRITICAL");
  });

  it("normal venting does not escalate", async () => {
    const { classifySafety } = await import("@/lib/safety/orchestrator");
    const result = await classifySafety({
      text: "Người yêu không quan tâm tôi hôm nay và tôi buồn.",
      language: "vi",
    });
    expect(["LOW", "MODERATE"]).toContain(result.decision.riskLevel);
  });
});
