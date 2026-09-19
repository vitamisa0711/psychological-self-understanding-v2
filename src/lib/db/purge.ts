/**
 * Hard-purge helper — LOCKED SPECIFICATION v1.0.0
 * Retention = 90 days from sessions.updated_at
 */

import { getServiceClient } from "./client";
import { RETENTION_DAYS } from "@/lib/config/constants";

/**
 * Call the database hard_purge_expired_sessions function.
 * Must be invoked with service role.
 * Returns number of sessions permanently deleted.
 */
export async function runHardPurge(
  retentionDays: number = RETENTION_DAYS
): Promise<number> {
  const client = getServiceClient();

  const { data, error } = await client.rpc("hard_purge_expired_sessions", {
    p_retention_days: retentionDays,
  });

  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

/**
 * Pure calculation helper for tests / dry-run.
 * A session is eligible for hard purge when:
 *   updated_at < now() - retentionDays
 */
export function isEligibleForHardPurge(
  updatedAt: Date | string,
  retentionDays: number = RETENTION_DAYS,
  now: Date = new Date()
): boolean {
  const updated = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return updated < cutoff;
}
