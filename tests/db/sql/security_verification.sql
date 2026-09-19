-- Real database security verification script
-- Run against a Supabase/Postgres instance AFTER promoting Phase 1 to COMPLETE.
-- Requires service_role connection for setup; then test as anon / authenticated.

-- ============================================================
-- Setup: two sessions, one analysis each
-- ============================================================
-- Run as service_role:

BEGIN;

INSERT INTO public.sessions (id, user_id, status)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NULL, 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', NULL, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.analyses (id, session_id, input_text, safety_level, status)
VALUES
  ('a1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'text A', 'LOW', 'completed'),
  ('b2222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'text B', 'LOW', 'completed')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================
-- Test 1: set_session_context is NOT callable by anon
-- Expected: permission denied
-- ============================================================
-- SET ROLE anon;
-- SELECT public.set_session_context('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
-- → ERROR: permission denied for function set_session_context

-- ============================================================
-- Test 2: Atomic rate limit under concurrency
-- ============================================================
-- Run as service_role, from multiple connections simultaneously:
--
-- SELECT * FROM public.check_and_increment_rate_limit('test:concurrent', 8, 3600);
--
-- Fire 20 concurrent calls. Count of allowed=true must be exactly 8.
-- Count of allowed=false must be 12.
--
-- Verify final row:
-- SELECT count FROM public.rate_limits WHERE key = 'test:concurrent';
-- → count >= 8 (exactly the number of increments that occurred; denied requests still increment past limit in current design,
--    or stay at limit depending on implementation — current design increments then checks, so count may be > limit.
--    allowed flag correctly reflects whether that request was within limit.)

-- ============================================================
-- Test 3: Atomic soft-delete
-- ============================================================
-- SELECT public.soft_delete_session('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
--
-- SELECT deleted_at IS NOT NULL, status FROM public.sessions WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
-- → true, 'deleted'
--
-- SELECT deleted_at IS NOT NULL FROM public.analyses WHERE session_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
-- → true for all rows
--
-- Partial state must not exist.

-- ============================================================
-- Test 4: safety_events — anon cannot SELECT/INSERT
-- ============================================================
-- SET ROLE anon;
-- SELECT * FROM public.safety_events;  → 0 rows or permission denied (RLS, no policy)
-- INSERT INTO public.safety_events (risk_level) VALUES ('HIGH'); → fail

-- ============================================================
-- Test 5: Cross-user / spoofing
-- Application layer (getOwnedSession) must deny when
-- verifiedCookieSessionId !== requested session id.
-- RLS additionally hides soft-deleted rows.
-- ============================================================

-- Cleanup (service_role):
-- DELETE FROM public.analyses WHERE session_id IN (...);
-- DELETE FROM public.sessions WHERE id IN (...);
-- DELETE FROM public.rate_limits WHERE key = 'test:concurrent';
