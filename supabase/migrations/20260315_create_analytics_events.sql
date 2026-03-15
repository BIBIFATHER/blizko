-- Product analytics events for supply / conversion / retention reporting
-- This mirrors the runtime auto-create path used by api/data.ts for analytics ingest.

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  url TEXT,
  session_id TEXT,
  user_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at ON analytics_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

COMMENT ON TABLE analytics_events IS 'Product analytics events for Blizko funnels and retention reporting';
