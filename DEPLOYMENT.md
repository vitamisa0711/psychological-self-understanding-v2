# Production Deployment Guide — Phase 14

## Prerequisites
- Vercel account + CLI (`npm i -g vercel`) or GitHub integration
- Supabase project (Production)
- OpenAI (or chosen) API key if `AI_PROVIDER=openai`

## 1. Supabase Production
**Production project (created Phase 14):**
- Name: `psychological-self-understanding-production`
- Project ref: `clxzyxptntcwoupapwhd`
- Region: `ap-southeast-1` (Singapore — lowest latency for Vietnamese users)
- URL: `https://clxzyxptntcwoupapwhd.supabase.co`

To set up a project from scratch (or recreate):
1. Create project at https://supabase.com
2. Copy **Project URL**, **anon public** key, **service_role** key (Settings → API)
3. Run migrations in order (SQL Editor, Supabase CLI, or the Supabase MCP connector's `apply_migration`):

```bash
# Option A: Supabase CLI
supabase link --project-ref <PROJECT_REF>
supabase db push

# Option B: paste each file in SQL Editor, in order:
# supabase/migrations/20260915000001_init_schema.sql
# supabase/migrations/20260915000002_rls_policies.sql
# supabase/migrations/20260915000003_hard_purge_function.sql
# supabase/migrations/20260915000004_security_fixes.sql
# supabase/migrations/20260918000005_phase11_persistence.sql
# supabase/migrations/20260918000006_phase14_security_fixes.sql   <- required, see note below
```

**Important:** migration `20260918000006_phase14_security_fixes.sql` is not optional.
Phase 14 verification found that `hard_purge_expired_sessions` (a mass-delete
function) was callable by any unauthenticated visitor via the public REST RPC
endpoint, because it was never explicitly revoked from `PUBLIC` in migration
`...000003` (Postgres grants `EXECUTE` to `PUBLIC` by default on function
creation). Confirmed exploitable by direct test before the fix. Any fresh
production project must apply migration `000006` immediately after `000005`.

4. Enable Email auth if you use authenticated users (Auth → Providers) — not
   currently used by this product; ownership is anonymous-cookie-only today.
5. After applying migrations, run `select * from` a security advisor check
   (Supabase Dashboard → Advisors → Security, or the MCP `get_advisors` tool)
   and confirm no unexpected `SECURITY DEFINER` functions are exposed to
   `anon`/`authenticated` beyond the documented exception (`is_session_owner`,
   required for RLS policy evaluation itself — see comment in migration 000006).

## 2. Vercel Environment Variables
Set in Vercel Project → Settings → Environment Variables (**Production**):

| Variable | Client? | Notes |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | anon key only |
| `SUPABASE_SERVICE_ROLE_KEY` | **NO** | server only |
| `SESSION_COOKIE_SECRET` | **NO** | long random string |
| `AI_PROVIDER` | **NO** | `mock` or `openai` |
| `AI_API_KEY` | **NO** | never NEXT_PUBLIC |
| `AI_MODEL` | **NO** | e.g. gpt-4o-mini |
| `NODE_ENV` | — | production (set by Vercel) |

Optional: `AI_TIMEOUT_MS`, `MAX_INPUT_CHARS`, rate limit vars.

**Never** set `NEXT_PUBLIC_AI_API_KEY` or `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

## 3. Deploy
```bash
# From repo root
vercel --prod
# or connect GitHub repo → Production branch auto-deploy
```

## 4. Post-deploy smoke (synthetic text only)
1. `GET https://<domain>/` → homepage
2. `GET https://<domain>/analyze` → input
3. `GET https://<domain>/api/session` → Set-Cookie HttpOnly
4. `POST /api/analyze` LOW sample → FORMULATION
5. CRITICAL synthetic → SAFETY_RESPONSE, no formulation
6. Confirm no secrets in browser Network/JS bundles

## 5. Do not use real user psychological data for testing.
