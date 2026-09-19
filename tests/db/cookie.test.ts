import { describe, it, expect } from "vitest";
import {
  createSessionCookie,
  parseSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/db/cookie";

describe("Session cookie", () => {
  const sessionId = "550e8400-e29b-41d4-a716-446655440000";

  it("creates a cookie with required security attributes", () => {
    const header = createSessionCookie(sessionId);
    expect(header).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Max-Age=");
  });

  it("round-trips a valid session id", () => {
    const header = createSessionCookie(sessionId);
    // simulate Cookie header (name=value only)
    const cookieValue = header.split(";")[0];
    const parsed = parseSessionCookie(cookieValue);
    expect(parsed).toBe(sessionId);
  });

  it("rejects tampered signature", () => {
    const header = createSessionCookie(sessionId);
    const cookieValue = header.split(";")[0];
    const tampered = cookieValue.slice(0, -4) + "xxxx";
    expect(parseSessionCookie(tampered)).toBeNull();
  });

  it("rejects invalid uuid shape", () => {
    // manually craft an expired-looking but wrong id
    const bad = parseSessionCookie(
      `${SESSION_COOKIE_NAME}=not-a-uuid.9999999999.fakesig`
    );
    expect(bad).toBeNull();
  });

  it("clearSessionCookie expires the cookie", () => {
    const header = clearSessionCookie();
    expect(header).toContain("Max-Age=0");
  });
});
