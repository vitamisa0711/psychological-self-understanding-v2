/**
 * GET /api/session — ensure anonymous session cookie exists
 */

import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  createSessionCookieValue,
  parseSessionCookieValue,
} from "@/lib/db/cookie";

export async function GET() {
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    const existing = jar.get(SESSION_COOKIE_NAME)?.value;
    if (existing) {
      const sessionId = parseSessionCookieValue(existing);
      if (sessionId) {
        return NextResponse.json({ sessionId, status: "existing" });
      }
    }

    let sessionId: string;
    try {
      const { createAnonymousSession } = await import("@/lib/db/session");
      const row = await createAnonymousSession();
      sessionId = row.id;
    } catch {
      sessionId = crypto.randomUUID();
    }

    const value = createSessionCookieValue(sessionId);
    const res = NextResponse.json({ sessionId, status: "created" });
    res.cookies.set(SESSION_COOKIE_NAME, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return res;
  } catch {
    return NextResponse.json(
      {
        error: "SESSION_ERROR",
        message: "Không tạo được phiên làm việc.",
      },
      { status: 500 }
    );
  }
}
