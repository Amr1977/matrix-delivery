const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');

router.get('/footer', async (req, res) => {
  try {
    const stats = {};

    // 1. Online Users (Drivers, Customers, Admins, Support)
    // Users are considered online if last_active is within the last 10 minutes

    // Drivers: Check driver_locations table for recent updates (most accurate for drivers)
    const onlineDriversResult = await pool.query(`
      SELECT COUNT(DISTINCT driver_id) as count 
      FROM driver_locations 
      WHERE timestamp > NOW() - INTERVAL '10 minutes'
    `);
    const onlineDrivers = parseInt(onlineDriversResult.rows[0].count);

    // Total counts by granted_roles (count users who have each primary_role in their granted_roles array)
    const totalDriversResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE 'driver' = ANY(granted_roles)");
    const totalDrivers = parseInt(totalDriversResult.rows[0].count);

    const totalCustomersResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE 'customer' = ANY(granted_roles)");
    const totalCustomers = parseInt(totalCustomersResult.rows[0].count);

    const totalAdminsResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE 'admin' = ANY(granted_roles)");
    const totalAdmins = parseInt(totalAdminsResult.rows[0].count);

    const totalSupportResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE 'support' = ANY(granted_roles)");
    const totalSupport = parseInt(totalSupportResult.rows[0].count);

    // Online users: Check last_active field (updated by heartbeat and activity tracking)
    // Users with multiple roles will be counted for each primary_role they have
    // NULL last_active means user has never sent a heartbeat (offline)
    const onlineUsersResult = await pool.query(`
      SELECT 
        user_role as primary_role,
        COUNT(DISTINCT user_id) as count
      FROM (
        SELECT 
          u.id as user_id,
          unnest(u.granted_roles) as user_role
        FROM users u
        WHERE u.last_active IS NOT NULL
        AND u.last_active > NOW() - INTERVAL '10 minutes'
      ) active_users
      WHERE user_role IN ('customer', 'admin', 'support')
      GROUP BY user_role
    `);

    const onlineCounts = {
      customer: 0,
      admin: 0,
      support: 0
    };
    onlineUsersResult.rows.forEach(row => {
      if (row.primary_role) {
        onlineCounts[row.primary_role] = parseInt(row.count);
      }
    });

    stats.drivers = { online: onlineDrivers, total: totalDrivers };
    stats.customers = { online: onlineCounts.customer, total: totalCustomers };
    stats.admins = { online: onlineCounts.admin, total: totalAdmins };
    stats.support = { online: onlineCounts.support || 0, total: totalSupport || 0 };

    // 2. Orders
    // Completed Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedTodayResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status = 'delivered' 
      AND delivered_at >= $1
    `, [today]);
    stats.ordersCompletedToday = parseInt(completedTodayResult.rows[0].count);

    // Current Active Orders
    const activeOrdersResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status NOT IN ('delivered', 'cancelled')
    `);
    stats.activeOrders = parseInt(activeOrdersResult.rows[0].count);

    // 3. Countries Reached
    const countriesResult = await pool.query(`
      SELECT COUNT(DISTINCT country) as count 
      FROM users 
      WHERE country IS NOT NULL
    `);
    stats.countriesReached = parseInt(countriesResult.rows[0].count);

    // 4. System Load (Requests per minute)
    // Count logs in last 1 minute
    const systemLoadResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM logs 
      WHERE timestamp > NOW() - INTERVAL '1 minute'
    `);
    const rpm = parseInt(systemLoadResult.rows[0].count);

    // Simple load measure: Low (<50 rpm), Medium (50-200), High (>200)
    let loadStatus = 'Low';
    if (rpm > 200) loadStatus = 'High';
    else if (rpm > 50) loadStatus = 'Medium';

    stats.systemLoad = {
      rpm: rpm,
      status: loadStatus
    };

    res.json(stats);
  } catch (error) {
    logger.error(`Get footer stats error: ${error.message}`, { category: 'error' });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
