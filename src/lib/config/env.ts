/**
 * Environment validation — LOCKED SPECIFICATION v1.0.0
 * Uses Zod. Missing required vars throw at startup.
 */

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Supabase (required for Phase 1+)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // AI Provider (required for Phase 4+)
  AI_PROVIDER: z.enum(["openai", "anthropic", "mock"]).default("mock"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-4o-mini"),

  // Rate limits (defaults from Locked Spec)
  RATE_LIMIT_IP_PER_HOUR: z.coerce.number().int().positive().default(8),
  RATE_LIMIT_SESSION_PER_DAY: z.coerce.number().int().positive().default(15),
  MAX_INPUT_CHARS: z.coerce.number().int().positive().default(4000),
  MAX_CONCURRENT_PER_SESSION: z.coerce.number().int().positive().default(1),

  // Timeouts (ms)
  SAFETY_TIMEOUT_MS: z.coerce.number().int().positive().default(25000),
  REASONING_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),

  // Privacy
  RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  SESSION_COOKIE_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }
  return parsed.data;
}

/** Validated env — call once at startup */
export const env = loadEnv();
