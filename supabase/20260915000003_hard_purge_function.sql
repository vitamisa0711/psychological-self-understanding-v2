-- LOCKED SPECIFICATION v1.0.0
-- Hard purge: permanently delete sessions (and cascaded children)
-- whose updated_at is older than 90 days AND that are soft-deleted,
-- OR active sessions that have not been updated for 90 days
-- (retention measured from last updated_at of the session).

CREATE OR REPLACE FUNCTION public.hard_purge_expired_sessions(
  p_retention_days integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz;
  v_deleted integer;
BEGIN
  IF p_retention_days < 1 THEN
    RAISE EXCEPTION 'retention_days must be >= 1';
  END IF;

  v_cutoff := now() - make_interval(days => p_retention_days);

  -- Delete sessions that are past retention.
  -- ON DELETE CASCADE on analyses.session_id will remove analyses.
  -- feedback cascades from analyses.
  -- safety_events.session_id is ON DELETE SET NULL (keeps minimal audit if needed).
  WITH deleted AS (
    DELETE FROM public.sessions
    WHERE updated_at < v_cutoff
    RETURNING id
  )
  SELECT count(*) INTO v_deleted FROM deleted;

  -- Also clean old rate-limit windows (older than 2 days is enough)
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '2 days';

  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.hard_purge_expired_sessions IS
  'Hard-deletes sessions older than retention (default 90 days from updated_at). Call periodically via cron / Supabase scheduled function.';

-- Example (run manually or via Supabase cron):
-- SELECT public.hard_purge_expired_sessions(90);
