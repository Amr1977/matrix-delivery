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

    // 2. Registered Users (Total Counts)
    // Vendors
    const totalVendorsResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE 'vendor' = ANY(granted_roles)",
    );
    const totalVendors = parseInt(totalVendorsResult.rows[0].count);

    // Drivers
    const totalDriversResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE 'driver' = ANY(granted_roles)",
    );
    const totalDrivers = parseInt(totalDriversResult.rows[0].count);

    // Customers
    const totalCustomersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE 'customer' = ANY(granted_roles)",
    );
    const totalCustomers = parseInt(totalCustomersResult.rows[0].count);

    stats.vendors = { total: totalVendors };
    stats.drivers = { total: totalDrivers };
    stats.customers = { total: totalCustomers };

    // 3. Orders (Lifetime)
    // Active
    const activeOrdersResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status NOT IN ('delivered', 'courier_delivered', 'customer_delivered', 'cancelled')
    `);
    stats.activeOrders = parseInt(activeOrdersResult.rows[0].count);

    // Total Lifetime Deliveries
    const totalDeliveriesResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status IN ('delivered', 'courier_delivered', 'customer_delivered')
    `);
    stats.totalDeliveriesLifetime = parseInt(
      totalDeliveriesResult.rows[0].count,
    );

    // (Optional: Keep today's count if needed by other components, otherwise strictly following new reqs)
    // We'll leave the old 'ordersCompletedToday' logic out as it is replaced by lifetime for the main view.

    // 4. System Load
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
