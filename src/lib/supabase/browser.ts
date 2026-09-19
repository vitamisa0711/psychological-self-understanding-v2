/**
 * Browser Supabase client — PHASE 11
 * Anon key only. Never service role.
 */

"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}
