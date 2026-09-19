-- PHASE 15 / V2 — Conversation Engine persistence
-- Adds two columns to messages to support multi-turn state tracking.
-- Does not change RLS, ownership, or any existing column.

-- conversation_state: which state the AI was in when it produced this turn
-- (VENTING | EXPLORATION | REFLECTION | FORMULATION | NO_FORMULATION_YET)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_state text NULL
    CHECK (conversation_state IN (
      'VENTING','EXPLORATION','REFLECTION','FORMULATION','NO_FORMULATION_YET'
    ));

-- conversation_meta: lightweight JSON snapshot of ConversationMemory at this turn.
-- Allows the engine to reconstruct context without re-reading the full history.
-- Stored as jsonb; never contains raw user text beyond what messages.content already holds.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_meta jsonb NULL;

COMMENT ON COLUMN public.messages.conversation_state IS
  'Conversation state when this assistant turn was produced (V2 engine).';
COMMENT ON COLUMN public.messages.conversation_meta IS
  'Lightweight memory snapshot for ConversationEngine continuity. No raw user text beyond content column.';
