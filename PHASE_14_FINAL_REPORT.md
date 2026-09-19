# PHASE 14 FINAL REPORT (Supabase Production — partial verification)

## Status
**PHASE 14 = INCOMPLETE**

Supabase production database work (project creation, migrations, RLS,
ownership isolation) is genuinely verified below, live, with synthetic data
only. Vercel deployment was explicitly deferred by the operator this session
and was not attempted. Phase 14 cannot be LOCKED until deployment, real AI
provider configuration, and a production smoke test are also done.

## 0. What was actually done (via the Supabase MCP connector, live)
Everything in this section is a real action against a real Supabase project,
not a static read of the repo.

## 1. Supabase Production project — PASS
- Created a **new, dedicated** production project: `psychological-self-understanding-production`, ref `clxzyxptntcwoupapwhd`, region `ap-southeast-1` (Singapore), free tier ($0/month).
- Explicitly did **not** reuse the pre-existing project (`addckyxndtxyhodivihr`) — inspection showed it had ad-hoc tables never tracked via migrations and was missing most of the schema, i.e. a dev/test leftover. Reusing it would have violated the "never use a test/dev database as production" rule.

## 2. Migrations — PASS
All 5 original migrations plus 1 new Phase-14 fix migration applied in order and confirmed tracked:

| # | Migration | Result |
|---|-----------|--------|
| 1 | `20260915000001_init_schema` | Applied |
| 2 | `20260915000002_rls_policies` | Applied |
| 3 | `20260915000003_hard_purge_function` | Applied |
| 4 | `20260915000004_security_fixes` | Applied |
| 5 | `20260918000005_phase11_persistence` | Applied |
| 6 | `20260918000006_phase14_security_fixes` (**new**, see §4) | Applied |

Verified against live `information_schema`/`pg_catalog`, not just the SQL files:
- All 8 expected tables exist: `sessions, analyses, feedback, safety_events, rate_limits, profiles, messages, model_runs`.
- All PKs, FKs, and CHECK constraints match the migration definitions exactly (spot-checked every table).
- All indexes match exactly, including the two partial indexes (`idx_sessions_deleted_at`, `idx_sessions_user_id`).
- Note: the illustrative table list in the Phase 14 spec (`users`, `psychology_documents`, `knowledge_chunks`, `sources`) does not match this product's actual locked schema — identity uses Supabase's built-in `auth.users` (no custom `users` table), and the Knowledge Base is file-based (`knowledge/concepts/*.json`), not stored in Postgres. This is the existing, already-verified Phase 1–13 architecture; no new tables were invented to match the spec's illustrative list.

## 3. Row Level Security — PASS (one critical issue found and fixed — see §4)
- RLS is **enabled** on all 8 tables; **forced** on the 5 Phase-1 tables (`sessions, analyses, feedback, safety_events, rate_limits`) so even table owners can't bypass it. (Phase-11 tables `messages/model_runs/profiles` have RLS enabled but not forced, matching the migration exactly as written — not a Phase 14 change.)
- All policies read back from `pg_policies` match the migration source exactly.
- **Live isolation tests**, run as the `anon` role (not the privileged connection role) against two synthetic sessions, all synthetic data deleted immediately after:

| Test | Result |
|------|--------|
| Session A reads only its own session/analysis/feedback rows | PASS |
| Session B reads only its own rows | PASS |
| Forged/unknown `sessionId` (matches no real session) sees any data | **0 rows returned — PASS** |
| Session A attempts to UPDATE (soft-delete) session B | **0 rows affected — PASS** |
| Session A attempts to overwrite session B's analysis content | **0 rows affected — PASS** |
| Session A attempts to INSERT a new analysis under session B's `session_id` | **Rejected outright** (`42501: new row violates row-level security policy`) — PASS |
| Any session attempts to hard-DELETE its own session row via `anon` | **0 rows deleted** (no DELETE policy exists — soft-delete only, via service-role RPC) — PASS |
| `anon` reads `safety_events` / `rate_limits`, even for its own session | **0 rows — PASS** (service-role only, by design) |
| `anon` calls `set_session_context`, `check_and_increment_rate_limit`, `soft_delete_session` | **Denied** (`permission denied for function`) — PASS |
| `service_role` calls the same 3 functions | **Succeeds correctly** — PASS |

## 4. Critical issue found via Supabase's security advisor — FOUND AND FIXED
Running Supabase's built-in security advisor after applying migrations 1–5
surfaced a real, exploitable production vulnerability that static code review
had not caught:

- **`hard_purge_expired_sessions`** (a mass hard-delete function) was
  **callable by any unauthenticated visitor** via the public REST RPC endpoint
  (`POST /rest/v1/rpc/hard_purge_expired_sessions`). Root cause: unlike the
  other three privileged functions, it was never explicitly `REVOKE`d from
  `PUBLIC` in the original migration — and Postgres grants `EXECUTE` to
  `PUBLIC` by default when a function is created. **Confirmed exploitable** by
  directly calling it as the `anon` role before the fix (it executed
  successfully; only returned 0 because no session happened to be old enough
  at test time — with real data this would have hard-deleted sessions,
  cascading to their analyses/feedback).
- **Fix applied** as new migration `20260918000006_phase14_security_fixes.sql`: revoked `EXECUTE` from `PUBLIC`/`anon`/`authenticated`, granted only to `service_role`. Re-verified live: `anon` now gets `permission denied`; `service_role` still works correctly.
- Also fixed in the same migration: `set_updated_at` (the `updated_at` trigger helper) had a mutable `search_path`, flagged by the advisor — added `SET search_path = public`, no behavior change.
- **One advisor finding was investigated and correctly left alone**: `is_session_owner` is also flagged as publicly executable. I tested revoking it — **this broke RLS entirely** for legitimate `anon` reads, because Postgres requires the querying role itself to hold `EXECUTE` on any function called inside a policy it evaluates. Reverted, re-verified normal access restored, and documented this as an intentional, necessary exception in the migration (the information it can leak is minimal: it only ever answers whether the *caller's own* identity owns a given session, which they already know).
- Remaining advisor output: 2 INFO-level "RLS enabled, no policy" on `safety_events`/`rate_limits` (intentional — service-role only, no user-facing policy is correct here) and 9 WARN-level performance suggestions (wrap `auth.uid()`/`current_setting()` in `(select ...)` in RLS policies to avoid per-row re-evaluation at scale). Non-blocking for a 10-user pilot; recommended before scaling further.

## 5. Authentication — PASS for what exists, with an important caveat
This product's live authentication mechanism is **anonymous signed-cookie
sessions only** — there is no login/signup UI or Supabase Auth call anywhere
in `src/app` (verified by source search). The `authenticated`-role RLS
policies exist in the schema for forward compatibility but are not exercised
by any current code path.
- Anonymous session ownership mechanism: verified correct in §3 (live RLS tests) and previously in Phase 13 unit tests (cookie signing/verification).
- A real Supabase Auth login flow (email/password, magic link, etc.) is **NOT VERIFIED** because it doesn't exist in the product yet — this is a scope/architecture fact, not a bug, and I did not add one (would violate "don't change locked architecture").

## 6. Ownership isolation — PASS
Covered exhaustively in §3's live test table. Every isolation property the
spec asked for (A can't read/update/delete B's data, forged `sessionId`
grants nothing, forged inserts are rejected) was proven against the live
database with synthetic data, not inferred from source review alone.

## 7. Cleanup
All synthetic test data (sessions, analyses, feedback, safety_events,
rate_limit keys) was deleted after each test. Final check confirms all 8
tables are empty — the production database is ready for real Phase 15 users
with a clean slate.

## 8. Explicitly NOT done this session (by operator instruction or missing prerequisites)
| Item | Status | Reason |
|------|--------|--------|
| Vercel deployment | **NOT DONE** | Explicitly deferred: "Không deploy Vercel lúc này" |
| Vercel environment variables set | **NOT DONE** | Depends on deployment |
| Real AI Provider (OpenAI) configured/tested | **NOT VERIFIED** | Requires a real API key from the operator; not requested this session |
| Production smoke test (live HTTP against a deployed URL) | **NOT RUN** | No deployment exists yet |
| Git / secret history audit | **NOT VERIFIED** | No `.git` directory present in the provided archive — nothing to scan; must be re-run against the actual repository before pushing to GitHub |
| Local regression (`npm test`, `typecheck`, `lint`, `build`, `test:security`) | Verified earlier this session on the code (after re-applying the Phase 13 fixes this zip was missing) — all pass | Unrelated to today's Supabase work but still current |

## FINAL
**PHASE 14 = INCOMPLETE**

Supabase production is genuinely ready (project, migrations, RLS, ownership
isolation all verified live, one critical vulnerability found and fixed).
Remaining blockers before LOCK: Vercel deployment, real AI provider
configuration, a production smoke test against a live URL, and a git/secret
audit of the actual repository. Do not mark COMPLETE/LOCKED until those are
done.
