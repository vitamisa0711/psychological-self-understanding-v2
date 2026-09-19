/**
 * Rate Limit interface — LOCKED SPECIFICATION v1.0.0
 * Storage backend for MVP = Supabase PostgreSQL only.
 */

export interface RateLimitKey {
  ip?: string;
  sessionId?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export interface RateLimitStore {
  /**
   * Check and increment counter.
   * Implementation must use Supabase PostgreSQL in MVP.
   */
  checkAndIncrement(
    key: RateLimitKey,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult>;
}
