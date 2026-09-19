-- LOCKED SPECIFICATION v1.0.0
-- Phase 1 Security Fixes (revised)
-- 1. set_session_context: REVOKE ALL FROM PUBLIC, grant only service_role
-- 2. check_and_increment_rate_limit: truly atomic including first-insert race
-- 3. soft_delete_session: atomic (unchanged semantics)

-- ============================================================
-- 1. set_session_context — only service_role
-- ============================================================
REVOKE ALL ON FUNCTION public.set_session_context(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_session_context(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_session_context(text) TO service_role;

-- ============================================================
-- 2. Atomic rate-limit (handles concurrent first insert of new key)
-- ============================================================
-- Pattern: single INSERT ... ON CONFLICT DO UPDATE.
-- PostgreSQL serializes concurrent conflicts on the same PK,
-- so two concurrent "first" requests for the same key cannot both
-- start from 0; one wins the insert, the other takes the update path.

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  limit_value integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now          timestamptz := clock_timestamp();
  v_cutoff       timestamptz;
  v_count        integer;
  v_window_start timestamptz;
  v_allowed      boolean;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'limit and window_seconds must be >= 1';
  END IF;

  v_cutoff := v_now - make_interval(secs => p_window_seconds);

  INSERT INTO public.rate_limits AS rl (key, count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN rl.window_start <= v_cutoff THEN 1          -- window expired → reset to 1
      ELSE rl.count + 1                                -- still in window → increment
    END,
    window_start = CASE
      WHEN rl.window_start <= v_cutoff THEN v_now
      ELSE rl.window_start
    END,
    updated_at = v_now
  RETURNING rl.count, rl.window_start
  INTO v_count, v_window_start;

  -- After the atomic write, decide allow/deny from the resulting count.
  -- If count exceeds limit, this request is the one that went over → deny
  -- and (optionally) we could clamp, but we keep the true count for observability.
  IF v_count <= p_limit THEN
    v_allowed := true;
  ELSE
    v_allowed := false;
  END IF;

  RETURN QUERY SELECT
    v_allowed,
    GREATEST(0, p_limit - v_count),
    v_window_start + make_interval(secs => p_window_seconds),
    p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) TO service_role;

COMMENT ON FUNCTION public.check_and_increment_rate_limit IS
  'Atomic rate-limit check+increment via INSERT ON CONFLICT. Safe for concurrent first inserts. service_role only.';

-- ============================================================
-- 3. Atomic soft-delete (session + analyses in one transaction)
-- ============================================================
CREATE OR REPLACE FUNCTION public.soft_delete_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now     timestamptz := now();
  v_updated integer;
BEGIN
  UPDATE public.sessions
  SET status = 'deleted',
      deleted_at = v_now,
      updated_at = v_now
  WHERE id = p_session_id
    AND deleted_at IS NULL
    AND status = 'active';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'session not found or already deleted: %', p_session_id;
  END IF;

  UPDATE public.analyses
  SET deleted_at = v_now,
      updated_at = v_now
  WHERE session_id = p_session_id
    AND deleted_at IS NULL;

  -- feedback has no deleted_at; becomes inaccessible via RLS through analyses/session
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_session(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_session(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_session(uuid) TO service_role;

COMMENT ON FUNCTION public.soft_delete_session IS
  'Atomic soft-delete of session + analyses. service_role only. Call only after server ownership check.';
