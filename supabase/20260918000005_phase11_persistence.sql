-- PHASE 11: Additional persistence foundation
-- Does not alter Phase 1 ownership/RLS semantics for sessions/analyses/safety_events

-- Application profile (links to auth.users; no credentials stored)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Messages (conversation turns within a session)
CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     text NOT NULL,
  sequence    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(session_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Authenticated: own sessions only (via sessions.user_id)
DROP POLICY IF EXISTS messages_select_own ON public.messages;
CREATE POLICY messages_select_own ON public.messages
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = messages.session_id
        AND s.deleted_at IS NULL
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS messages_insert_own ON public.messages;
CREATE POLICY messages_insert_own ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = messages.session_id
        AND s.deleted_at IS NULL
        AND s.user_id = auth.uid()
    )
  );

-- Model run metadata (no raw prompts/responses)
CREATE TABLE IF NOT EXISTS public.model_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   uuid NULL REFERENCES public.analyses(id) ON DELETE SET NULL,
  session_id    uuid NULL REFERENCES public.sessions(id) ON DELETE SET NULL,
  provider      text NOT NULL,
  model_id      text NULL,
  status        text NOT NULL CHECK (status IN ('ok', 'failed', 'blocked', 'timeout')),
  latency_ms    integer NULL,
  error_code    text NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_runs_analysis_id ON public.model_runs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_model_runs_session_id ON public.model_runs(session_id);

ALTER TABLE public.model_runs ENABLE ROW LEVEL SECURITY;

-- model_runs: authenticated users can read runs for their analyses only
DROP POLICY IF EXISTS model_runs_select_own ON public.model_runs;
CREATE POLICY model_runs_select_own ON public.model_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analyses a
      JOIN public.sessions s ON s.id = a.session_id
      WHERE a.id = model_runs.analysis_id
        AND s.user_id = auth.uid()
        AND s.deleted_at IS NULL
    )
  );

-- Inserts via service role only (no policy for authenticated insert)
-- Service role bypasses RLS

COMMENT ON TABLE public.messages IS 'SENSITIVE content — RLS ownership via session.user_id';
COMMENT ON TABLE public.model_runs IS 'Metadata only — no raw psychological content';
COMMENT ON TABLE public.profiles IS 'Minimal profile linked to auth.users — no PII required';
