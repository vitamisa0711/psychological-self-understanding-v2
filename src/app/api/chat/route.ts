/**
 * POST /api/chat — PHASE 15 / V2
 *
 * Multi-turn conversational endpoint. Safety gate (Phase 1–14) still runs on
 * every message before any conversation logic executes. HIGH/CRITICAL/UNCERTAIN
 * → SAFETY_RESPONSE, conversation engine never runs.
 *
 * Ownership: signed HttpOnly cookie (same as /api/analyze, unchanged).
 * Body fields other than `message` are never trusted for safety or ownership.
 */

import { NextRequest, NextResponse } from "next/server";
import { classifySafety } from "@/lib/safety/orchestrator";
import { toProductSafetyDecision } from "@/lib/pipeline/product-safety-gate";
import { runConversationTurn, loadConversationHistory, saveConversationTurn, emptyMemory } from "@/lib/conversation";
import type { ConversationState } from "@/lib/conversation";

const MAX_INPUT = Number(process.env.MAX_INPUT_CHARS ?? 4000);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { kind: "ERROR", code: "EMPTY_INPUT", message: "Vui lòng nhập nội dung." },
        { status: 400 }
      );
    }
    if (message.length > MAX_INPUT) {
      return NextResponse.json(
        { kind: "ERROR", code: "INPUT_TOO_LONG", message: `Vượt quá ${MAX_INPUT} ký tự.` },
        { status: 400 }
      );
    }

    // ── Session ownership (server-verified cookie only) ──────────────────
    let sessionId: string | undefined;
    try {
      const { cookies } = await import("next/headers");
      const { SESSION_COOKIE_NAME, parseSessionCookieValue } = await import("@/lib/db/cookie");
      const jar = await cookies();
      const raw = jar.get(SESSION_COOKIE_NAME)?.value;
      const fromCookie = parseSessionCookieValue(raw);
      if (fromCookie) sessionId = fromCookie;
    } catch { /* optional */ }

    // ── Phase 1–14 Safety Gate (LOCKED, unchanged) ───────────────────────
    const safetyResult = await classifySafety({ text: message, language: "vi" });
    const decision = toProductSafetyDecision(safetyResult);

    if (decision.action === "SAFETY_GATE" || decision.action === "FAIL_CLOSED") {
      // Persist safety event (privacy-safe: no raw text stored in safety_events)
      try {
        const { getServiceClient } = await import("@/lib/db/client");
        const { persistSafetyEvent } = await import("@/lib/db/persistence/safety-events");
        await persistSafetyEvent(getServiceClient(), {
          sessionId,
          riskLevel: decision.status,
          requestId: undefined,
        });
      } catch { /* non-blocking */ }

      const isCritical = decision.status === "CRITICAL";
      return NextResponse.json({
        kind: "SAFETY_RESPONSE",
        safety: decision,
        message: isCritical
          ? "Nội dung bạn chia sẻ cho thấy có thể đang có nguy cơ an toàn nghiêm trọng. Hệ thống không thể tiếp tục. Nếu bạn đang trong tình huống khẩn cấp, hãy liên hệ đường dây hỗ trợ khủng hoảng hoặc dịch vụ y tế ngay."
          : "Nội dung bạn chia sẻ có một số dấu hiệu cần được ưu tiên về an toàn. Hệ thống không thể tiếp tục phân tích lúc này.",
      });
    }

    // ── Load conversation history ─────────────────────────────────────────
    let turns: import("@/lib/conversation").ConversationTurn[] = [];
    let memory = emptyMemory();
    let currentState: ConversationState = "VENTING";
    let nextSequence = 0;

    if (sessionId) {
      try {
        const { getServiceClient } = await import("@/lib/db/client");
        const client = getServiceClient();
        const loaded = await loadConversationHistory(client, sessionId);
        turns = loaded.turns;
        memory = loaded.memory;
        currentState = loaded.currentState;
        nextSequence = turns.length;
      } catch { /* graceful degradation */ }
    }

    // ── Run conversation engine ───────────────────────────────────────────
    const engineOutput = await runConversationTurn({
      sessionId: sessionId ?? "anonymous",
      userMessage: message,
      history: turns,
      memory,
      currentState,
    });

    // ── Persist both turns ────────────────────────────────────────────────
    if (sessionId) {
      try {
        const { getServiceClient } = await import("@/lib/db/client");
        const client = getServiceClient();

        // User turn
        await saveConversationTurn(client, {
          sessionId,
          role: "user",
          content: message,
          sequence: nextSequence,
          state: currentState,
        });

        // Assistant turn (with memory snapshot)
        await saveConversationTurn(client, {
          sessionId,
          role: "assistant",
          content: engineOutput.response,
          sequence: nextSequence + 1,
          state: engineOutput.nextState,
          memory: engineOutput.updatedMemory,
        });
      } catch (err) {
        console.error("[chat] persistence failed:", err instanceof Error ? err.message : "unknown");
      }
    }

    return NextResponse.json({
      kind: "CONVERSATION",
      safety: decision,
      state: engineOutput.nextState,
      response: engineOutput.response,
    });
  } catch (err) {
    console.error("[chat] unhandled error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { kind: "ERROR", code: "SERVER_ERROR", message: "Đã xảy ra lỗi. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}

// GET: return conversation history for this session
export async function GET(req: NextRequest) {
  try {
    let sessionId: string | undefined;
    try {
      const { cookies } = await import("next/headers");
      const { SESSION_COOKIE_NAME, parseSessionCookieValue } = await import("@/lib/db/cookie");
      const jar = await cookies();
      const raw = jar.get(SESSION_COOKIE_NAME)?.value;
      const fromCookie = parseSessionCookieValue(raw);
      if (fromCookie) sessionId = fromCookie;
    } catch { /* optional */ }

    if (!sessionId) {
      return NextResponse.json({ turns: [], state: "VENTING" });
    }

    const { getServiceClient } = await import("@/lib/db/client");
    const client = getServiceClient();
    const { turns, currentState } = await loadConversationHistory(client, sessionId);

    return NextResponse.json({
      turns: turns.map((t) => ({ role: t.role, content: t.content, state: t.state })),
      state: currentState,
    });
  } catch {
    return NextResponse.json({ turns: [], state: "VENTING" });
  }
}
