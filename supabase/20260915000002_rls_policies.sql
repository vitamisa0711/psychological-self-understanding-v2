-- LOCKED SPECIFICATION v1.0.0
-- Phase 1: Row Level Security
--
-- Ownership rules:
--   1. Anonymous session: access only when current_setting('app.session_id') = sessions.id
--      (set by application from the signed cookie)
--   2. Authenticated: access only when auth.uid() = sessions.user_id
--   3. Soft-deleted rows (deleted_at IS NOT NULL) are invisible to all user roles
--   4. safety_events: service_role only

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analyses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE public.safety_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: is the current request the owner of this session?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_session_owner(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = p_session_id
      AND s.deleted_at IS NULL
      AND s.status = 'active'
      AND (
        -- Authenticated ownership
        (s.user_id IS NOT NULL AND s.user_id = auth.uid())
        OR
        -- Anonymous ownership via app.session_id setting
        (s.user_id IS NULL AND s.id::text = current_setting('app.session_id', true))
      )
  );
$$;

-- ============================================================
-- sessions policies
-- ============================================================
DROP POLICY IF EXISTS sessions_select_own ON public.sessions;
CREATE POLICY sessions_select_own ON public.sessions
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND status = 'active'
    AND (
      (user_id IS NOT NULL AND user_id = auth.uid())
      OR
      (user_id IS NULL AND id::text = current_setting('app.session_id', true))
    )
  );

DROP POLICY IF EXISTS sessions_insert_own ON public.sessions;
CREATE POLICY sessions_insert_own ON public.sessions
  FOR INSERT
  WITH CHECK (
    -- Authenticated user can only insert with their own user_id
    (user_id IS NOT NULL AND user_id = auth.uid())
    OR
    -- Anonymous insert: user_id must be null; ownership established by cookie later
    (user_id IS NULL)
  );

DROP POLICY IF EXISTS sessions_update_own ON public.sessions;
CREATE POLICY sessions_update_own ON public.sessions
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      (user_id IS NOT NULL AND user_id = auth.uid())
      OR
      (user_id IS NULL AND id::text = current_setting('app.session_id', true))
    )
  );

-- No DELETE policy for users — soft-delete only via UPDATE

-- ============================================================
-- analyses policies
-- ============================================================
DROP POLICY IF EXISTS analyses_select_own ON public.analyses;
CREATE POLICY analyses_select_own ON public.analyses
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.is_session_owner(session_id)
  );

DROP POLICY IF EXISTS analyses_insert_own ON public.analyses;
CREATE POLICY analyses_insert_own ON public.analyses
  FOR INSERT
  WITH CHECK (
    public.is_session_owner(session_id)
  );

DROP POLICY IF EXISTS analyses_update_own ON public.analyses;
CREATE POLICY analyses_update_own ON public.analyses
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND public.is_session_owner(session_id)
  );

-- ============================================================
-- feedback policies
-- ============================================================
DROP POLICY IF EXISTS feedback_select_own ON public.feedback;
CREATE POLICY feedback_select_own ON public.feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses a
      WHERE a.id = feedback.analysis_id
        AND a.deleted_at IS NULL
        AND public.is_session_owner(a.session_id)
    )
  );

DROP POLICY IF EXISTS feedback_insert_own ON public.feedback;
CREATE POLICY feedback_insert_own ON public.feedback
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses a
      WHERE a.id = feedback.analysis_id
        AND a.deleted_at IS NULL
        AND public.is_session_owner(a.session_id)
    )
  );

-- ============================================================
-- safety_events — NO user policies (service_role only)
-- ============================================================
-- Intentionally no SELECT/INSERT/UPDATE/DELETE policies for anon/authenticated.
-- Only the service_role key (which bypasses RLS) can access this table.

-- ============================================================
-- rate_limits — service_role / application only
-- ============================================================
-- No user-facing policies. Application uses service role or a restricted function.

-- ============================================================
-- Helper RPC: set app.session_id for the current transaction
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_session_context(p_session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.session_id', p_session_id, true);
END;
$$;

-- GRANT removed: only service_role may call set_session_context (see 000004)
-- GRANT EXECUTE ON FUNCTION public.set_session_context(text) TO service_role;
