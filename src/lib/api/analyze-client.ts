/**
 * Frontend API client — PHASE 12
 * No safety/reasoning logic. Typed parse of server response only.
 */

export type AnalyzeClientResult =
  | {
      kind: "FORMULATION";
      safety: { status?: string; action?: string };
      formulation?: unknown;
      generation?: unknown;
      generationStatus?: string;
    }
  | {
      kind: "SAFETY_RESPONSE" | "SAFE_FAILURE" | "VALIDATION_FAILURE";
      safety?: { status?: string; action?: string };
      message?: string;
      safetyResponse?: { message?: string };
      safeFailure?: { message?: string };
    }
  | {
      kind: "ERROR";
      code?: string;
      message: string;
    };

export async function postAnalyze(input: {
  text: string;
  sessionId?: string;
}): Promise<AnalyzeClientResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: input.text,
      sessionId: input.sessionId,
    }),
    credentials: "same-origin",
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return {
      kind: "ERROR",
      code: "INVALID_JSON",
      message: "Phản hồi không hợp lệ từ máy chủ.",
    };
  }

  const obj = data as Record<string, unknown>;
  const kind = typeof obj.kind === "string" ? obj.kind : "ERROR";

  if (!res.ok && kind === "ERROR") {
    return {
      kind: "ERROR",
      code: typeof obj.code === "string" ? obj.code : String(res.status),
      message:
        typeof obj.message === "string"
          ? obj.message
          : "Không thể xử lý yêu cầu.",
    };
  }

  if (
    kind === "FORMULATION" ||
    kind === "SAFETY_RESPONSE" ||
    kind === "SAFE_FAILURE" ||
    kind === "VALIDATION_FAILURE"
  ) {
    return data as AnalyzeClientResult;
  }

  return {
    kind: "ERROR",
    code: "UNKNOWN",
    message:
      typeof obj.message === "string"
        ? obj.message
        : "Phản hồi không hợp lệ từ máy chủ.",
  };
}
