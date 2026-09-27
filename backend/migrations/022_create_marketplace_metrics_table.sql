-- Marketplace Metrics Table
-- Stores periodic snapshots of marketplace business KPIs for monitoring and alerting

CREATE TABLE IF NOT EXISTS marketplace_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metric_type VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'weekly'
    -- Order flow metrics
    total_orders INTEGER DEFAULT 0,
    orders_pending_bids INTEGER DEFAULT 0,
    orders_vendor_confirmed INTEGER DEFAULT 0,
    orders_assigned INTEGER DEFAULT 0,
    orders_delivered INTEGER DEFAULT 0,
    orders_cancelled INTEGER DEFAULT 0,
    -- Vendor performance
    active_vendors INTEGER DEFAULT 0,
    avg_vendor_rating DECIMAL(3,2),
    -- Financial metrics
    order_volume_egp DECIMAL(14,2) DEFAULT 0,
    commission_collected_egp DECIMAL(14,2) DEFAULT 0,
    payouts_pending_egp DECIMAL(14,2) DEFAULT 0,
    -- Delivery metrics
    avg_preparation_time_minutes INTEGER,
    avg_delivery_time_minutes INTEGER,
    -- Error rates
    order_creation_failures INTEGER DEFAULT 0,
    inventory_conflicts INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_marketplace_metrics_timestamp ON marketplace_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_metrics_type_timestamp ON marketplace_metrics(metric_type, timestamp DESC);

-- Auto-cleanup: Keep 30 days of data
CREATE OR REPLACE FUNCTION cleanup_old_marketplace_metrics() RETURNS void AS $$
BEGIN
    DELETE FROM marketplace_metrics WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
