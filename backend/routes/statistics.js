const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const logger = require("../config/logger");

router.get("/footer", async (req, res) => {
  try {
    const stats = {};

    // 1. Uptime Calculation
    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    let uptimeString = "";
    if (days > 0) uptimeString += `${days}d `;
    if (hours > 0) uptimeString += `${hours}h `;
    uptimeString += `${minutes}m`;

    stats.uptime = uptimeString;

    // 2. Registered Users (Total & Online Counts)
    const driversResult = await pool.query(
      "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_available = true) as online FROM users WHERE 'driver' = ANY(granted_roles)",
    );
    stats.drivers = {
      total: parseInt(driversResult.rows[0].total),
      online: parseInt(driversResult.rows[0].online),
    };

    const customersResult = await pool.query(
      "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_available = true) as online FROM users WHERE 'customer' = ANY(granted_roles)",
    );
    stats.customers = {
      total: parseInt(customersResult.rows[0].total),
      online: parseInt(customersResult.rows[0].online),
    };

    const adminsResult = await pool.query(
      "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_available = true) as online FROM users WHERE 'admin' = ANY(granted_roles)",
    );
    stats.admins = {
      total: parseInt(adminsResult.rows[0].total),
      online: parseInt(adminsResult.rows[0].online),
    };

    const supportResult = await pool.query(
      "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_available = true) as online FROM users WHERE 'support' = ANY(granted_roles)",
    );
    stats.support = {
      total: parseInt(supportResult.rows[0].total),
      online: parseInt(supportResult.rows[0].online),
    };

    // Vendors (for backward compatibility with landing page)
    const vendorsResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE 'vendor' = ANY(granted_roles)",
    );
    stats.vendors = { total: parseInt(vendorsResult.rows[0].count) };

    // 3. Orders
    // Active
    const activeOrdersResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status NOT IN ('delivered', 'courier_delivered', 'customer_delivered', 'cancelled')
    `);
    stats.activeOrders = parseInt(activeOrdersResult.rows[0].count);

    // Completed Today
    const completedTodayResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status IN ('delivered', 'courier_delivered', 'customer_delivered')
        AND DATE(completed_at) = CURRENT_DATE
    `);
    stats.ordersCompletedToday = parseInt(completedTodayResult.rows[0].count);

    // Total Lifetime Deliveries (for backward compatibility with landing page)
    const totalDeliveriesResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status IN ('delivered', 'courier_delivered', 'customer_delivered')
    `);
    stats.totalDeliveriesLifetime = parseInt(
      totalDeliveriesResult.rows[0].count,
    );

    // 4. Countries Reached
    const countriesResult = await pool.query(`
      SELECT COUNT(DISTINCT country) as count FROM users WHERE country IS NOT NULL AND country != ''
    `);
    stats.countriesReached = parseInt(countriesResult.rows[0].count);

    // 5. System Load
    const systemLoadResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM logs 
      WHERE timestamp > NOW() - INTERVAL '1 minute'
    `);
    const rpm = parseInt(systemLoadResult.rows[0].count);
    let loadStatus = "Low";
    if (rpm > 200) loadStatus = "High";
    else if (rpm > 50) loadStatus = "Medium";

    stats.systemLoad = {
      rpm: rpm,
      status: loadStatus,
    };

    res.json(stats);
  } catch (error) {
    logger.error(`Get footer stats error: ${error.message}`, {
      category: "error",
    });
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

module.exports = router;
