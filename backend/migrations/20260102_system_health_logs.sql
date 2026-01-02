-- System Health Logs Table
-- Stores periodic snapshots of system health metrics for monitoring

CREATE TABLE IF NOT EXISTS system_health_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    memory_percent DECIMAL(5,2),
    memory_used_mb INTEGER,
    memory_available_mb INTEGER,
    pm2_total_memory_mb INTEGER,
    pm2_processes JSONB,  -- [{name, status, memory_mb, restarts}]
    active_ws_connections INTEGER DEFAULT 0
);

-- Index for time-based queries (critical for chart performance)
CREATE INDEX IF NOT EXISTS idx_health_logs_timestamp ON system_health_logs(timestamp DESC);

-- Auto-cleanup: Keep only 3 days of data
-- This function will be called periodically by the health collector
CREATE OR REPLACE FUNCTION cleanup_old_health_logs() RETURNS void AS $$
BEGIN
    DELETE FROM system_health_logs WHERE timestamp < NOW() - INTERVAL '3 days';
END;
$$ LANGUAGE plpgsql;
