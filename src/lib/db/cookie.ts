/**
 * Anonymous session cookie — LOCKED SPECIFICATION v1.0.0
 *
 * HttpOnly + Secure + SameSite=Lax
 * max-age = 30 days
 * Value = session UUID (signed in production with a secret)
 *
 * Phase 1 provides the contract and a simple HMAC-ready shape.
 * Real signing secret comes from env (SESSION_COOKIE_SECRET) when available.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { SESSION_COOKIE_MAX_AGE_DAYS } from "@/lib/config/constants";

export const SESSION_COOKIE_NAME = "psu_session";

const MAX_AGE_SECONDS = SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

export interface SessionCookiePayload {
  sessionId: string;
  /** unix seconds */
  exp: number;
}

function getSecret(): string {
  // In Phase 1 we accept a dedicated env or fall back to a dev-only value.
  // Production MUST set SESSION_COOKIE_SECRET.
  const secret = process.env.SESSION_COOKIE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_COOKIE_SECRET is required in production");
    }
    return "dev-only-insecure-secret-change-me";
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

/**
 * Create the Set-Cookie header value for an anonymous session.
 */
export function createSessionCookie(sessionId: string): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${sessionId}.${exp}`;
  const signature = sign(payload);
  const value = `${payload}.${signature}`;

  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
  ];
  return parts.join("; ");
}

/**
 * Parse and verify the cookie value.
 * Returns sessionId or null if invalid / expired.
 */
export function parseSessionCookie(
  cookieHeader: string | undefined | null
): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!match) return null;

  const raw = match.slice(SESSION_COOKIE_NAME.length + 1);
  const parts = raw.split(".");
  if (parts.length !== 3) return null;

  const [sessionId, expStr, signature] = parts;
  const payload = `${sessionId}.${expStr}`;
  const expected = sign(payload);

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  // Basic UUID shape check
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sessionId
    )
  ) {
    return null;
  }

  return sessionId;
}

/**
 * Cookie that clears the session (for logout / delete).
 */
export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

/**
 * Parse raw cookie value (without name= prefix).
 */
export function parseSessionCookieValue(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return parseSessionCookie(`${SESSION_COOKIE_NAME}=${raw}`);
}

/**
 * Cookie value only (for NextResponse.cookies.set).
 */
export function createSessionCookieValue(sessionId: string): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = `${sessionId}.${exp}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}
