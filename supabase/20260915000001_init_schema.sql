-- LOCKED SPECIFICATION v1.0.0
-- Phase 1: Core schema
-- Retention: 90 days from sessions.updated_at
-- Soft-delete: set deleted_at → data immediately inaccessible via RLS

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL,
  user_id         uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'deleted')),
  -- anonymous ownership is enforced via signed cookie containing session id
  CONSTRAINT sessions_status_deleted_at_check
    CHECK (
      (status = 'active' AND deleted_at IS NULL) OR
      (status = 'deleted' AND deleted_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON public.sessions(deleted_at)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON public.sessions(updated_at);

COMMENT ON TABLE public.sessions IS 'User exploration sessions. Soft-deleted via deleted_at.';

-- ============================================================
-- analyses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analyses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz NULL,
  input_text        text NOT NULL,                    -- sensitive
  analysis_json     jsonb NULL,                       -- sensitive (null when safety_blocked)
  safety_level      text NOT NULL
                      CHECK (safety_level IN ('LOW','MODERATE','HIGH','CRITICAL','UNCERTAIN')),
  model             text NULL,
  prompt_version    text NULL,
  knowledge_version text NULL,
  reasoning_version text NULL,
  safety_version    text NULL,
  schema_version    text NULL,
  model_version     text NULL,
  privacy_policy_version text NULL,
  status            text NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('completed','safety_blocked','failed','safe_failure')),
  request_id        text NULL
);

CREATE INDEX IF NOT EXISTS idx_analyses_session_id ON public.analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_analyses_deleted_at ON public.analyses(deleted_at)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at);

COMMENT ON COLUMN public.analyses.input_text IS 'SENSITIVE — psychological content';
COMMENT ON COLUMN public.analyses.analysis_json IS 'SENSITIVE — psychological content';

-- ============================================================
-- feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  helpful       boolean NOT NULL,
  reason        text NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_analysis_id ON public.feedback(analysis_id);

-- ============================================================
-- safety_events  (service-role only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.safety_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NULL REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  risk_level    text NOT NULL
                  CHECK (risk_level IN ('LOW','MODERATE','HIGH','CRITICAL','UNCERTAIN')),
  request_id    text NULL
  -- raw psychological content is intentionally NOT stored
);

CREATE INDEX IF NOT EXISTS idx_safety_events_session_id ON public.safety_events(session_id);
CREATE INDEX IF NOT EXISTS idx_safety_events_created_at ON public.safety_events(created_at);

COMMENT ON TABLE public.safety_events IS 'Service-role only. No user-readable access. Minimal content.';

-- ============================================================
-- rate_limits  (PostgreSQL is the only rate-limit store for MVP)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           text PRIMARY KEY,          -- e.g. "ip:1.2.3.4" or "session:<uuid>"
  count         integer NOT NULL DEFAULT 0,
  window_start  timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

-- ============================================================
-- updated_at trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON public.sessions;
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_analyses_updated_at ON public.analyses;
CREATE TRIGGER trg_analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
