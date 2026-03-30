const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const pool = require("../config/db");

const IS_TEST =
  process.env.NODE_ENV === "test" || process.env.NODE_ENV === "testing";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Health check endpoint
 * GET /api/health
 * Returns server health status and basic statistics
 */
router.get("/", async (req, res) => {
  try {
    const usersResult = await pool.query("SELECT COUNT(*) as count FROM users");
    const ordersResult = await pool.query(
      "SELECT COUNT(*) as count FROM orders",
    );
    const openOrdersResult = await pool.query(
      "SELECT COUNT(*) as count FROM orders WHERE status = 'pending_bids'",
    );
    const acceptedOrdersResult = await pool.query(
      "SELECT COUNT(*) as count FROM orders WHERE status = 'accepted'",
    );
    const completedOrdersResult = await pool.query(
      "SELECT COUNT(*) as count FROM orders WHERE status IN ('delivered', 'courier_delivered', 'customer_delivered')",
    );

    res.json({
      status: "healthy",
      environment: IS_TEST
        ? "testing"
        : IS_PRODUCTION
          ? "production"
          : "development",
      database: "PostgreSQL",
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      stats: {
        users: parseInt(usersResult.rows[0].count),
        orders: parseInt(ordersResult.rows[0].count),
        openOrders: parseInt(openOrdersResult.rows[0].count),
        activeOrders: parseInt(acceptedOrdersResult.rows[0].count),
        completedOrders: parseInt(completedOrdersResult.rows[0].count),
      },
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Health check error:", error);
    res.status(500).json({ status: "unhealthy", error: error.message });
  }
});

/**
 * Footer statistics endpoint
 * GET /api/health/footer/stats
 * Provides real-time system status for footer display
 */
router.get("/footer/stats", async (req, res) => {
  try {
    // Get users by primary_role
    const usersByRoleResult = await pool.query(
      `SELECT primary_role, COUNT(*) as count FROM users GROUP BY primary_role`,
    );
    const usersByRole = {};
    usersByRoleResult.rows.forEach((row) => {
      usersByRole[row.primary_role] = parseInt(row.count);
    });

    // Get active orders (accepted, picked_up, in_transit)
    const activeOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders
       WHERE status IN ('accepted', 'picked_up', 'in_transit')`,
    );
    const activeOrders = parseInt(activeOrdersResult.rows[0].count);

    // Get pending bids orders
    const pendingOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE status = 'pending_bids'`,
    );
    const pendingOrders = parseInt(pendingOrdersResult.rows[0].count);

    // Get total completed orders
    const completedOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE status IN ('delivered', 'courier_delivered', 'customer_delivered')`,
    );
    const completedOrders = parseInt(completedOrdersResult.rows[0].count);

    // Get total revenue
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(assigned_driver_bid_price), 0) as total
       FROM orders WHERE status IN ('delivered', 'courier_delivered', 'customer_delivered') AND assigned_driver_bid_price IS NOT NULL`,
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total);

    // Get active drivers (drivers with active orders)
    const activeDriversResult = await pool.query(
      `SELECT COUNT(DISTINCT assigned_driver_user_id) as count
       FROM orders
       WHERE status IN ('accepted', 'picked_up', 'in_transit')
       AND assigned_driver_user_id IS NOT NULL`,
    );
    const activeDrivers = parseInt(activeDriversResult.rows[0].count);

    // Get system uptime and deployment info
    const uptime = process.uptime();
    const deploymentTimestamp = new Date().toISOString();

    // Get average rating
    const avgRatingResult = await pool.query(
      `SELECT AVG(rating) as avg_rating FROM reviews`,
    );
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;

    // Get today's orders
    const todayOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders
       WHERE DATE(created_at) = CURRENT_DATE`,
    );
    const todayOrders = parseInt(todayOrdersResult.rows[0].count);

    res.json({
      deploymentTimestamp,
      serverUptime: uptime,
      usersByRole,
      activeOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      activeDrivers,
      avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      todayOrders,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Footer stats error:", error);
    res.status(500).json({ error: "Failed to get footer statistics" });
  }
});

module.exports = router;
