/**
 * Supabase clients — LOCKED SPECIFICATION v1.0.0
 * Phase 1 Security Fix
 *
 * - anon client: user JWT context (authenticated users)
 * - service client: server-only (cookie verification, rate-limit, soft-delete, safety_events)
 *
 * set_session_context is NO LONGER callable by anon/authenticated.
 * Anonymous ownership is established only after server verifies the signed cookie.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/config/env";

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

function requireSupabaseConfig() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase URL and anon key are required. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
}

/**
 * Anon / user-scoped client (authenticated users via Supabase Auth).
 * Do not use this to set arbitrary session context.
 */
export function getAnonClient(): SupabaseClient {
  requireSupabaseConfig();
  if (!anonClient) {
    anonClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }
  return anonClient;
}

/**
 * Service-role client — NEVER expose to the browser.
 * Used after server verifies signed cookie, for rate-limit, soft-delete, safety_events, purge.
 */
export function getServiceClient(): SupabaseClient {
  requireSupabaseConfig();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for service operations.");
  }
  if (!serviceClient) {
    serviceClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return serviceClient;
}
