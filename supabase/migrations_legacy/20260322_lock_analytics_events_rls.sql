-- Lock down analytics_events so direct client access is impossible.
-- Writes/reads should only happen through server endpoints using service_role / DB pool.

ALTER TABLE IF EXISTS analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_events_service_only" ON analytics_events;

CREATE POLICY "analytics_events_service_only" ON analytics_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
