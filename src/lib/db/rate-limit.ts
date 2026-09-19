/**
 * RateLimitStore — atomic PostgreSQL implementation
 * LOCKED SPECIFICATION v1.0.0 — Phase 1 Security Fix
 *
 * Uses single SECURITY DEFINER function with row lock.
 * No SELECT-then-UPSERT race.
 */

import { getServiceClient } from "./client";
import type { RateLimitKey, RateLimitResult, RateLimitStore } from "@/types/rate-limit";

function buildKey(key: RateLimitKey): string {
  if (key.sessionId) return `session:${key.sessionId}`;
  if (key.ip) return `ip:${key.ip}`;
  throw new Error("RateLimitKey must have ip or sessionId");
}

export class SupabaseRateLimitStore implements RateLimitStore {
  async checkAndIncrement(
    key: RateLimitKey,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const client = getServiceClient();
    const storageKey = buildKey(key);

    const { data, error } = await client.rpc("check_and_increment_rate_limit", {
      p_key: storageKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      throw new Error("check_and_increment_rate_limit returned no data");
    }

    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining),
      resetAt: new Date(row.reset_at),
      limit: Number(row.limit_value ?? limit),
    };
  }
}

export const rateLimitStore: RateLimitStore = new SupabaseRateLimitStore();
