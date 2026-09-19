-- PHASE 14 production security fixes
-- Found via Supabase security advisor during Phase 14 production verification.
--
-- 1. hard_purge_expired_sessions was never REVOKEd from PUBLIC in migration
--    20260915000003 (unlike set_session_context / check_and_increment_rate_limit /
--    soft_delete_session, which migration 20260915000004 correctly locked down).
--    Postgres GRANTs EXECUTE to PUBLIC by default on function creation, so this
--    mass-delete function was callable by ANY anonymous internet visitor via
--    POST /rest/v1/rpc/hard_purge_expired_sessions. Confirmed exploitable by
--    direct test as the anon role before this fix. Lock to service_role only,
--    matching the pattern already used for the other privileged functions.
REVOKE ALL ON FUNCTION public.hard_purge_expired_sessions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hard_purge_expired_sessions(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hard_purge_expired_sessions(integer) TO service_role;

-- 2. set_updated_at (the updated_at trigger helper) was created without a
--    fixed search_path, unlike every other function in this schema. Flagged
--    by the advisor as "Function Search Path Mutable". The function does not
--    reference any unqualified objects, so exploitability here is low, but
--    fixing it costs nothing and brings it in line with the rest of the schema.
ALTER FUNCTION public.set_updated_at() SET search_path = public;

-- Note: is_session_owner(uuid) is intentionally NOT revoked from anon/authenticated.
-- It is invoked inside RLS policy expressions (analyses_select_own, etc.), and
-- Postgres requires the querying role itself to hold EXECUTE on any function
-- referenced by a policy it evaluates — revoking it breaks RLS entirely for
-- legitimate anon/authenticated reads. This was verified empirically during
-- Phase 14 testing (revoking it caused "permission denied for function
-- is_session_owner" on a legitimate owner's own read). The information this
-- function could leak is minimal: it only ever answers whether the CALLER's
-- own current identity (their own auth.uid() or their own app.session_id, which
-- they cannot forge to someone else's via RLS) owns a given session id.
