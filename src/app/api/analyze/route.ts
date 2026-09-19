/**
 * POST /api/analyze — Phase 10–13 server boundary
 * Single entry: analyzeUserInput (safety → gate → reasoning → one generation).
 * Ownership: signed HttpOnly cookie only. body.sessionId is never authority.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeUserInput } from "@/lib/pipeline/product-safety-gate";
import type { AnalyzeRequest } from "@/lib/pipeline/types";
import type { SafetyLevel } from "@/lib/supabase/types";

const MAX_INPUT = Number(process.env.MAX_INPUT_CHARS ?? 4000);

async function tryPersist(opts: {
  sessionId?: string;
  text: string;
  safetyLevel: SafetyLevel;
  status: "completed" | "safety_blocked" | "failed" | "safe_failure";
  analysisJson?: unknown | null;
  requestId?: string;
  provider?: string;
  modelId?: string;
  genStatus?: "ok" | "failed" | "blocked" | "timeout";
}) {
  try {
    const { getServiceClient } = await import("@/lib/db/client");
    const client = getServiceClient();
    const { persistAnalysis } = await import("@/lib/db/persistence/analyses");
    const { persistSafetyEvent } = await import(
      "@/lib/db/persistence/safety-events"
    );
    const { persistModelRun } = await import(
      "@/lib/db/persistence/model-runs"
    );

    if (
      opts.safetyLevel === "HIGH" ||
      opts.safetyLevel === "CRITICAL" ||
      opts.safetyLevel === "UNCERTAIN"
    ) {
      await persistSafetyEvent(client, {
        sessionId: opts.sessionId,
        riskLevel: opts.safetyLevel,
        requestId: opts.requestId,
      });
    }

    if (opts.sessionId) {
      const analysis = await persistAnalysis(client, {
        sessionId: opts.sessionId,
        inputText: opts.text,
        analysisJson: opts.analysisJson ?? null,
        safetyLevel: opts.safetyLevel,
        status: opts.status,
        requestId: opts.requestId,
      });
      if ("id" in analysis && opts.provider) {
        await persistModelRun(client, {
          analysisId: analysis.id,
          sessionId: opts.sessionId,
          provider: opts.provider,
          modelId: opts.modelId,
          status: opts.genStatus ?? "ok",
        });
      }
    }
  } catch (err) {
    // Missing/misconfigured Supabase must not break the user-facing analyze
    // response — but a silent, unlogged failure here means persistence could
    // be broken in production with nobody able to notice. Log a privacy-safe
    // diagnostic only: error name/message never contains raw user text or
    // secrets (Supabase client errors don't include credentials), and we
    // never log opts.text or opts.analysisJson here.
    console.error(
      "[analyze] persistence failed (request continues without saving):",
      err instanceof Error ? err.message : "unknown error"
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const text = typeof body.text === "string" ? body.text : "";

    // Ownership: signed HttpOnly cookie only (body.sessionId is NEVER ownership).
    // Ignore any client-forged authority fields (an id field on the request
    // body, a client-supplied session id, a client-supplied safety status,
    // etc.) — none of them are ever read as identity or safety authority.
    // Only the server-verified signed cookie establishes session ownership
    // below.
    let sessionId: string | undefined;
    try {
      const { cookies } = await import("next/headers");
      const { SESSION_COOKIE_NAME, parseSessionCookieValue } = await import(
        "@/lib/db/cookie"
      );
      const jar = await cookies();
      const raw = jar.get(SESSION_COOKIE_NAME)?.value;
      const fromCookie = parseSessionCookieValue(raw);
      if (fromCookie) sessionId = fromCookie;
    } catch {
      /* optional without full env */
    }

    const request: AnalyzeRequest = {
      text,
      language: "vi",
      sessionId,
    };

    if (!text.trim()) {
      return NextResponse.json(
        {
          kind: "ERROR",
          code: "EMPTY_INPUT",
          message: "Vui lòng nhập nội dung trước khi gửi.",
        },
        { status: 400 }
      );
    }

    if (text.length > MAX_INPUT) {
      return NextResponse.json(
        {
          kind: "ERROR",
          code: "INPUT_TOO_LONG",
          message: `Nội dung vượt quá giới hạn ${MAX_INPUT} ký tự.`,
        },
        { status: 400 }
      );
    }

    const pipelineResult = await analyzeUserInput(request);
    const risk = (pipelineResult.safety?.status ??
      "UNCERTAIN") as SafetyLevel;

    if (pipelineResult.kind !== "FORMULATION") {
      await tryPersist({
        sessionId: request.sessionId,
        text,
        safetyLevel: risk,
        status:
          risk === "HIGH" || risk === "CRITICAL"
            ? "safety_blocked"
            : "safe_failure",
        analysisJson: null,
      });

      return NextResponse.json({
        kind: pipelineResult.kind,
        safety: pipelineResult.safety,
        safetyResponse: pipelineResult.safetyResponse,
        safeFailure: pipelineResult.safeFailure,
        message:
          pipelineResult.safetyResponse?.message ??
          pipelineResult.safeFailure?.message ??
          "Không thể tiếp tục phân tích.",
      });
    }

    await tryPersist({
      sessionId: request.sessionId,
      text,
      safetyLevel: risk,
      status: "completed",
      analysisJson: {
        formulation: pipelineResult.formulation,
        generation: pipelineResult.aiOutput ?? null,
      },
      provider: "pipeline",
      genStatus:
        pipelineResult.generationStatus === "OK"
          ? "ok"
          : pipelineResult.generationStatus === "BLOCKED"
            ? "blocked"
            : "failed",
    });

    return NextResponse.json({
      kind: "FORMULATION",
      safety: pipelineResult.safety,
      formulation: pipelineResult.formulation,
      generation: pipelineResult.aiOutput ?? null,
      generationStatus: pipelineResult.generationStatus,
    });
  } catch {
    return NextResponse.json(
      {
        kind: "ERROR",
        code: "SERVER_ERROR",
        message: "Đã xảy ra lỗi khi xử lý nội dung. Vui lòng thử lại sau.",
      },
      { status: 500 }
    );
  }
}
