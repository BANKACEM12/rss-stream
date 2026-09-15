CREATE TABLE public.ingest_state (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
  lease_until TIMESTAMP WITH TIME ZONE,
  cursor INTEGER NOT NULL DEFAULT 0,
  paused BOOLEAN NOT NULL DEFAULT false,
  last_error TEXT,
  last_run_at TIMESTAMP WITH TIME ZONE,
  inserted_total INTEGER NOT NULL DEFAULT 0
);

GRANT ALL ON public.ingest_state TO service_role;

ALTER TABLE public.ingest_state ENABLE ROW LEVEL SECURITY;

INSERT INTO public.ingest_state (id) VALUES ('singleton');