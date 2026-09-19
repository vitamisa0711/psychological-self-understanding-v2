/**
 * Live DB helpers for Phase 1 security integration tests.
 * Tests SKIP (not PASS) when credentials are absent.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type LiveClients = {
  service: SupabaseClient;
  anon: SupabaseClient;
};

export function hasLiveDbCredentials(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getLiveClients(): LiveClients {
  if (!hasLiveDbCredentials()) {
    throw new Error(
      "Live DB credentials missing. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { service, anon };
}

export function skipIfNoLiveDb(): boolean {
  if (!hasLiveDbCredentials()) {
    console.warn(
      "[SKIP] Live Supabase credentials not set — integration tests not executed."
    );
    return true;
  }
  return false;
}

export function randomUuid(): string {
  return crypto.randomUUID();
}
