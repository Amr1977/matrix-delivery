const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../config/logger');

router.get('/footer', async (req, res) => {
  try {
    const stats = {};

    // 1. Online Users (Drivers, Customers, Admins, Support)
    // We assume "online" means activity recorded in logs within the last 10 minutes OR driver location update in last 10 minutes

    // Drivers: Check driver_locations table for recent updates (most accurate for drivers)
    const onlineDriversResult = await pool.query(`
      SELECT COUNT(DISTINCT driver_id) as count 
      FROM driver_locations 
      WHERE timestamp > NOW() - INTERVAL '10 minutes'
    `);
    const onlineDrivers = parseInt(onlineDriversResult.rows[0].count);

    // Total Drivers
    const totalDriversResult = await pool.query("SELECT COUNT(*) as count FROM users WHERE primary_role = 'driver'");
    const totalDrivers = parseInt(totalDriversResult.rows[0].count);

    // For other roles, usage checks via logs table might be heavy if table is huge. 
    // Optimization: query distinct user_ids from logs where timestamp > now - 10m
    const onlineUsersResult = await pool.query(`
      SELECT u.primary_role, COUNT(DISTINCT l.user_id) as count
      FROM logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.timestamp > NOW() - INTERVAL '10 minutes'
      AND u.primary_role IN ('customer', 'admin', 'support')
      GROUP BY u.primary_role
    `);

    const onlineCounts = {
      customer: 0,
      admin: 0,
      support: 0
    };
    onlineUsersResult.rows.forEach(row => {
      onlineCounts[row.role] = parseInt(row.count);
    });

    // Total counts for other roles
    const totalRolesResult = await pool.query(`
      SELECT primary_role, COUNT(*) as count FROM users 
      WHERE primary_role IN ('customer', 'admin', 'support') 
      GROUP BY role
    `);
    const totalCounts = {
      customer: 0,
      admin: 0,
      support: 0
    };
    totalRolesResult.rows.forEach(row => {
      totalCounts[row.role] = parseInt(row.count);
    });

    stats.drivers = { online: onlineDrivers, total: totalDrivers };
    stats.customers = { online: onlineCounts.customer, total: totalCounts.customer };
    stats.admins = { online: onlineCounts.admin, total: totalCounts.admin };
    stats.support = { online: onlineCounts.support || 0, total: totalCounts.support || 0 };

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
