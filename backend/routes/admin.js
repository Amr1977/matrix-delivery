// ============ ADMIN ROUTES ============
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { generateId } = require('../utils/generators');
const { JWT_SECRET } = require('../config');
const { verifyAdmin } = require('../middleware/auth');
const { logAdminAction } = require('../services/adminService');
const logger = require('../services/loggingService');
const { createNotification } = require('../services/notificationService.ts');

// Admin authentication middleware
const verifyAdmin = async (req, res, next) => {
  try {
    // Check for token in cookies first (preferred method)
    let token = req.cookies?.token;

    // Fall back to Authorization header
    if (!token) {
      token = req.headers['authorization']?.split(' ')[1];
    }

    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT id, email, name, primary_role, granted_roles FROM users WHERE id = $1',
      [decoded.userId]
    );

    const row = userResult.rows[0];
    const hasAdmin = row && (row.primary_role === 'admin' || (Array.isArray(row.granted_roles) && row.granted_roles.includes('admin')));
    if (userResult.rows.length === 0 || !hasAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decoded;
    req.admin = { id: row.id, email: row.email, name: row.name };
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Log admin actions
const logAdminAction = async (adminId, action, targetType, targetId, details = {}) => {
  try {
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [adminId, action, targetType, targetId, JSON.stringify(details), details.ip || 'unknown']
    );
  } catch (error) {
    console.error('Log admin action error:', error);
  }
};

// ============ ADMIN DASHBOARD STATISTICS ============
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const { range = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get total users
    const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Get new users in range
    const newUsersResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= $1',
      [startDate]
    );
    const newUsers = parseInt(newUsersResult.rows[0].count);

    // Get users by role
    const usersByRoleResult = await pool.query(
      `SELECT primary_role, COUNT(*) as count FROM users GROUP BY primary_role`
    );
    const usersByRole = {};
    usersByRoleResult.rows.forEach(row => {
      usersByRole[row.primary_role] = parseInt(row.count);
    });

    // Get total orders
    const totalOrdersResult = await pool.query('SELECT COUNT(*) as count FROM orders');
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);

    // Get orders by status
    const ordersByStatusResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    );
    const ordersByStatus = [];
    const statusColors = {
      'pending_bids': '#FCD34D',
      'accepted': '#60A5FA',
      'picked_up': '#C084FC',
      'in_transit': '#F472B6',
      'delivered': '#34D399',
      'cancelled': '#F87171'
    };

    ordersByStatusResult.rows.forEach(row => {
      ordersByStatus.push({
        name: row.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: parseInt(row.count),
        color: statusColors[row.status] || '#9CA3AF'
      });
    });

    // Get active orders
    const activeOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE status IN ('accepted', 'picked_up', 'in_transit')`
    );
    const activeOrders = parseInt(activeOrdersResult.rows[0].count);

    // Get completed orders
    const completedOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'`
    );
    const completedOrders = parseInt(completedOrdersResult.rows[0].count);

    // Calculate revenue
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(assigned_driver_bid_price), 0) as total 
       FROM orders WHERE status = 'delivered' AND assigned_driver_bid_price IS NOT NULL`
    );
    const revenue = parseFloat(revenueResult.rows[0].total);

    // Get revenue by month
    const revenueDataResult = await pool.query(
      `SELECT 
        TO_CHAR(delivered_at, 'Mon') as month,
        COALESCE(SUM(assigned_driver_bid_price), 0) as revenue
       FROM orders 
       WHERE status = 'delivered' 
         AND delivered_at >= NOW() - INTERVAL '6 months'
         AND assigned_driver_bid_price IS NOT NULL
       GROUP BY TO_CHAR(delivered_at, 'Mon'), DATE_TRUNC('month', delivered_at)
       ORDER BY DATE_TRUNC('month', delivered_at) ASC`
    );
    const revenueData = revenueDataResult.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue)
    }));

    // Get user growth
    const userGrowthResult = await pool.query(
      `SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as date,
        COUNT(*) as users
       FROM users 
       WHERE created_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY TO_CHAR(created_at, 'YYYY-MM') ASC`
    );

    let cumulativeUsers = totalUsers - newUsers;
    const userGrowth = userGrowthResult.rows.map(row => {
      cumulativeUsers += parseInt(row.users);
      return {
        date: row.date,
        users: cumulativeUsers
      };
    });

    // Calculate metrics
    const avgOrderValueResult = await pool.query(
      `SELECT AVG(assigned_driver_bid_price) as avg_value 
       FROM orders 
       WHERE status = 'delivered' AND assigned_driver_bid_price IS NOT NULL`
    );
    const avgOrderValue = parseFloat(avgOrderValueResult.rows[0].avg_value) || 0;

    const completionRateResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN status != 'pending_bids' THEN 1 END), 0) as rate
       FROM orders`
    );
    const completionRate = parseFloat(completionRateResult.rows[0].rate) || 0;

    const avgDeliveryTimeResult = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - accepted_at)) / 3600) as avg_hours
       FROM orders 
       WHERE status = 'delivered' 
         AND accepted_at IS NOT NULL 
         AND delivered_at IS NOT NULL`
    );
    const avgDeliveryTime = parseFloat(avgDeliveryTimeResult.rows[0].avg_hours) || 0;

    const avgRatingResult = await pool.query(
      `SELECT AVG(rating) as avg_rating FROM reviews`
    );
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;

    res.json({
      totalUsers,
      newUsers,
      usersByRole,
      totalOrders,
      activeOrders,
      completedOrders,
      revenue,
      ordersByStatus,
      revenueData,
      userGrowth,
      metrics: {
        avgOrderValue,
        completionRate,
        avgDeliveryTime,
        avgRating
      }
    });

    await logAdminAction(req.admin.id, 'VIEW_STATS', 'dashboard', null, { range, ip: req.ip });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// ============ USER MANAGEMENT ============
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = 'all', status = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(
        LOWER(name) LIKE LOWER($${paramCount}) OR 
        LOWER(email) LIKE LOWER($${paramCount}) OR 
        id LIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (role !== 'all') {
      whereConditions.push(`primary_role = $${paramCount}`);
      queryParams.push(role);
      paramCount++;
    }

    if (status === 'verified') {
      whereConditions.push(`is_verified = true`);
    } else if (status === 'unverified') {
      whereConditions.push(`is_verified = false`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      queryParams
    );
    const totalCount = parseInt(countResult.rows[0].count);

    queryParams.push(parseInt(limit), offset);
    const usersResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.primary_role, u.vehicle_type,
        u.rating, u.completed_deliveries, u.is_verified, u.is_available,
        u.country, u.city, u.area, u.created_at,
        (SELECT COUNT(*) FROM orders WHERE customer_id = u.id OR assigned_driver_user_id = u.id) as total_orders,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      queryParams
    );

    const users = usersResult.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.primary_role,
      vehicleType: user.vehicle_type,
      rating: parseFloat(user.rating),
      completedDeliveries: user.completed_deliveries,
      isVerified: user.is_verified,
      isAvailable: user.is_available,
      country: user.country,
      city: user.city,
      area: user.area,
      totalOrders: parseInt(user.total_orders),
      totalReviews: parseInt(user.total_reviews),
      createdAt: user.created_at
    }));

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

    await logAdminAction(req.admin.id, 'VIEW_USERS', 'users', null, { page, limit, search, role, ip: req.ip });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get single user details
router.get('/users/:id', verifyAdmin, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT 
        u.*,
        (SELECT COUNT(*) FROM orders WHERE customer_id = u.id) as customer_orders,
        (SELECT COUNT(*) FROM orders WHERE assigned_driver_user_id = u.id) as driver_orders,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as reviews_received,
        (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id) as reviews_given,
        (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as avg_rating
       FROM users u
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const ordersResult = await pool.query(
      `SELECT * FROM orders 
       WHERE customer_id = $1 OR assigned_driver_user_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [req.params.id]
    );

    const reviewsResult = await pool.query(
      `SELECT r.*, reviewer.name as reviewer_name, reviewee.name as reviewee_name
       FROM reviews r
       LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
       LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
       WHERE r.reviewer_id = $1 OR r.reviewee_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.primary_role,
        vehicleType: user.vehicle_type,
        rating: parseFloat(user.rating),
        completedDeliveries: user.completed_deliveries,
        isVerified: user.is_verified,
        isAvailable: user.is_available,
        country: user.country,
        city: user.city,
        area: user.area,
        customerOrders: parseInt(user.customer_orders),
        driverOrders: parseInt(user.driver_orders),
        reviewsReceived: parseInt(user.reviews_received),
        reviewsGiven: parseInt(user.reviews_given),
        avgRating: parseFloat(user.avg_rating) || 0,
        createdAt: user.created_at
      },
      recentOrders: ordersResult.rows,
      recentReviews: reviewsResult.rows
    });

    await logAdminAction(req.admin.id, 'VIEW_USER_DETAILS', 'user', req.params.id, { ip: req.ip });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Verify user
router.post('/users/:id/verify', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_verified = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    await createNotification(
      user.id,
      null,
      'account_verified',
      'Account Verified',
      'Your account has been verified by an administrator.'
    );

    console.log(`✅ Admin ${req.admin.name} verified user: ${user.email}`);
    await logAdminAction(req.admin.id, 'VERIFY_USER', 'user', req.params.id, {
      userName: user.name,
      userEmail: user.email,
      ip: req.ip
    });

    res.json({
      message: 'User verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isVerified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// CONTINUE IN NEXT MESSAGE - This is Part 1 of 3

// ============ ADMIN BACKEND API ENDPOINTS - PART 2 ============
// Continue from Part 1

// Suspend user
router.post('/users/:id/suspend', verifyAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_available = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    await createNotification(
      user.id,
      null,
      'account_suspended',
      'Account Suspended',
      `Your account has been suspended. ${reason ? `Reason: ${reason}` : 'Please contact support.'}`
    );

    console.log(`⚠️ Admin ${req.admin.name} suspended user: ${user.email}`);
    await logAdminAction(req.admin.id, 'SUSPEND_USER', 'user', req.params.id, {
      userName: user.name,
      userEmail: user.email,
      reason,
      ip: req.ip
    });

    res.json({
      message: 'User suspended successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAvailable: user.is_available
      }
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Unsuspend user
router.post('/users/:id/unsuspend', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_available = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    await createNotification(
      user.id,
      null,
      'account_unsuspended',
      'Account Reactivated',
      'Your account has been reactivated.'
    );

    console.log(`✅ Admin ${req.admin.name} unsuspended user: ${user.email}`);
    await logAdminAction(req.admin.id, 'UNSUSPEND_USER', 'user', req.params.id, {
      userName: user.name,
      userEmail: user.email,
      ip: req.ip
    });

    res.json({
      message: 'User unsuspended successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAvailable: user.is_available
      }
    });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({ error: 'Failed to unsuspend user' });
  }
});

// Delete user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const activeOrdersResult = await client.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE (customer_id = $1 OR assigned_driver_user_id = $1)
       AND status IN ('pending_bids', 'accepted', 'picked_up', 'in_transit')`,
      [req.params.id]
    );

    if (parseInt(activeOrdersResult.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Cannot delete user with active orders.'
      });
    }

    await client.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');

    console.log(`🗑️ Admin ${req.admin.name} deleted user: ${user.email}`);
    await logAdminAction(req.admin.id, 'DELETE_USER', 'user', req.params.id, {
      userName: user.name,
      userEmail: user.email,
      ip: req.ip
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    client.release();
  }
});

// ============ ORDER MANAGEMENT ============
router.get('/orders', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (status !== 'all') {
      whereConditions.push(`o.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`(
        o.order_number LIKE $${paramCount} OR
        o.title LIKE $${paramCount} OR
        o.id LIKE $${paramCount} OR
        c.name LIKE $${paramCount} OR
        c.email LIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders o
       LEFT JOIN users c ON o.customer_id = c.id
       ${whereClause}`,
      queryParams
    );
    const totalCount = parseInt(countResult.rows[0].count);

    queryParams.push(parseInt(limit), offset);
    const ordersResult = await pool.query(
      `SELECT 
        o.*,
        c.name as customer_name,
        c.email as customer_email,
        d.name as driver_name,
        d.email as driver_email,
        (SELECT COUNT(*) FROM bids WHERE order_id = o.id) as bid_count
       FROM orders o
       LEFT JOIN users c ON o.customer_id = c.id
       LEFT JOIN users d ON o.assigned_driver_user_id = d.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      queryParams
    );

    const orders = ordersResult.rows.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      title: order.title,
      description: order.description,
      pickupAddress: order.pickup_address,
      deliveryAddress: order.delivery_address,
      price: parseFloat(order.price),
      status: order.status,
      customerId: order.customer_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      driverId: order.assigned_driver_user_id,
      driverName: order.driver_name,
      driverEmail: order.driver_email,
      assignedDriverBidPrice: order.assigned_driver_bid_price ? parseFloat(order.assigned_driver_bid_price) : null,
      bidCount: parseInt(order.bid_count),
      createdAt: order.created_at,
      acceptedAt: order.accepted_at,
      pickedUpAt: order.picked_up_at,
      deliveredAt: order.delivered_at,
      cancelledAt: order.cancelled_at
    }));

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

    await logAdminAction(req.admin.id, 'VIEW_ORDERS', 'orders', null, { page, limit, status, search, ip: req.ip });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get single order details
router.get('/orders/:id', verifyAdmin, async (req, res) => {
  try {
    const orderResult = await pool.query(
      `SELECT 
        o.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        d.name as driver_name,
        d.email as driver_email,
        d.phone as driver_phone,
        d.vehicle_type as driver_vehicle_type
       FROM orders o
       LEFT JOIN users c ON o.customer_id = c.id
       LEFT JOIN users d ON o.assigned_driver_user_id = d.id
       WHERE o.id = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    const bidsResult = await pool.query(
      `SELECT b.*, u.name as driver_name, u.email as driver_email, u.phone as driver_phone,
              u.rating as driver_rating, u.completed_deliveries as driver_deliveries
       FROM bids b
       JOIN users u ON b.user_id = u.id
       WHERE b.order_id = $1
       ORDER BY b.created_at DESC`,
      [req.params.id]
    );

    const locationUpdatesResult = await pool.query(
      `SELECT * FROM location_updates 
       WHERE order_id = $1 
       ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );

    const paymentResult = await pool.query(
      `SELECT * FROM payments WHERE order_id = $1`,
      [req.params.id]
    );

    res.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        title: order.title,
        description: order.description,
        pickupAddress: order.pickup_address,
        deliveryAddress: order.delivery_address,
        from: {
          lat: parseFloat(order.from_lat),
          lng: parseFloat(order.from_lng),
          name: order.from_name
        },
        to: {
          lat: parseFloat(order.to_lat),
          lng: parseFloat(order.to_lng),
          name: order.to_name
        },
        packageDescription: order.package_description,
        packageWeight: order.package_weight ? parseFloat(order.package_weight) : null,
        estimatedValue: order.estimated_value ? parseFloat(order.estimated_value) : null,
        specialInstructions: order.special_instructions,
        price: parseFloat(order.price),
        status: order.status,
        customer: {
          id: order.customer_id,
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone
        },
        driver: order.assigned_driver_user_id ? {
          id: order.assigned_driver_user_id,
          name: order.driver_name,
          email: order.driver_email,
          phone: order.driver_phone,
          vehicleType: order.driver_vehicle_type
        } : null,
        assignedDriverBidPrice: order.assigned_driver_bid_price ? parseFloat(order.assigned_driver_bid_price) : null,
        createdAt: order.created_at,
        acceptedAt: order.accepted_at,
        pickedUpAt: order.picked_up_at,
        deliveredAt: order.delivered_at,
        cancelledAt: order.cancelled_at
      },
      bids: bidsResult.rows,
      locationUpdates: locationUpdatesResult.rows,
      payment: paymentResult.rows[0] || null
    });

    await logAdminAction(req.admin.id, 'VIEW_ORDER_DETAILS', 'order', req.params.id, { ip: req.ip });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to get order details' });
  }
});

// Cancel order
router.post('/orders/:id/cancel', verifyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { reason } = req.body;

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status === 'delivered' || order.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot cancel completed or already cancelled order' });
    }

    await client.query(
      `UPDATE orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );

    await createNotification(
      order.customer_id,
      order.id,
      'order_cancelled',
      'Order Cancelled',
      `Your order ${order.order_number} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`
    );

    if (order.assigned_driver_user_id) {
      await createNotification(
        order.assigned_driver_user_id,
        order.id,
        'order_cancelled',
        'Order Cancelled',
        `Order ${order.order_number} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`
      );
    }

    await client.query('COMMIT');

    console.log(`❌ Admin ${req.admin.name} cancelled order: ${order.order_number}`);
    await logAdminAction(req.admin.id, 'CANCEL_ORDER', 'order', req.params.id, {
      orderNumber: order.order_number,
      reason,
      ip: req.ip
    });

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

// CONTINUE IN PART 3

// ============ ADMIN BACKEND API ENDPOINTS - PART 3 (FINAL) ============
// Continue from Part 2

// ============ ANALYTICS & REPORTS ============
router.get('/analytics/performance', verifyAdmin, async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const avgOrderValueResult = await pool.query(
      `SELECT AVG(assigned_driver_bid_price) as avg_value 
       FROM orders 
       WHERE status = 'delivered' 
         AND assigned_driver_bid_price IS NOT NULL
         AND delivered_at >= $1`,
      [startDate]
    );

    const completionRateResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN status != 'pending_bids' THEN 1 END), 0) as rate
       FROM orders
       WHERE created_at >= $1`,
      [startDate]
    );

    const avgDeliveryTimeResult = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - accepted_at)) / 3600) as avg_hours
       FROM orders 
       WHERE status = 'delivered' 
         AND accepted_at IS NOT NULL 
         AND delivered_at IS NOT NULL
         AND delivered_at >= $1`,
      [startDate]
    );

    const avgRatingResult = await pool.query(
      `SELECT AVG(rating) as avg_rating 
       FROM reviews 
       WHERE created_at >= $1`,
      [startDate]
    );

    const topDriversResult = await pool.query(
      `SELECT 
        u.id, u.name, u.email, u.rating,
        COUNT(o.id) as deliveries,
        COALESCE(SUM(o.assigned_driver_bid_price), 0) as earnings
       FROM users u
       JOIN orders o ON o.assigned_driver_user_id = u.id
       WHERE u.primary_role = 'driver' 
         AND o.status = 'delivered'
         AND o.delivered_at >= $1
       GROUP BY u.id, u.name, u.email, u.rating
       ORDER BY deliveries DESC, earnings DESC
       LIMIT 10`,
      [startDate]
    );

    const ordersByHourResult = await pool.query(
      `SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
       FROM orders
       WHERE created_at >= $1
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      [startDate]
    );

    res.json({
      performance: {
        avgOrderValue: parseFloat(avgOrderValueResult.rows[0].avg_value) || 0,
        completionRate: parseFloat(completionRateResult.rows[0].rate) || 0,
        avgDeliveryTime: parseFloat(avgDeliveryTimeResult.rows[0].avg_hours) || 0,
        customerSatisfaction: parseFloat(avgRatingResult.rows[0].avg_rating) || 0
      },
      topDrivers: topDriversResult.rows.map(driver => ({
        id: driver.id,
        name: driver.name,
        email: driver.email,
        rating: parseFloat(driver.rating),
        deliveries: parseInt(driver.deliveries),
        earnings: parseFloat(driver.earnings)
      })),
      ordersByHour: ordersByHourResult.rows.map(row => ({
        hour: `${String(row.hour).padStart(2, '0')}:00`,
        orders: parseInt(row.count)
      }))
    });

    await logAdminAction(req.admin.id, 'VIEW_ANALYTICS', 'analytics', null, { range, ip: req.ip });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ============ SYSTEM LOGS ============
router.get('/logs', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type = 'all', startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (type !== 'all') {
      whereConditions.push(`action LIKE $${paramCount}`);
      queryParams.push(`${type.toUpperCase()}%`);
      paramCount++;
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramCount}`);
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramCount}`);
      queryParams.push(endDate);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM admin_logs ${whereClause}`,
      queryParams
    );
    const totalCount = parseInt(countResult.rows[0].count);

    queryParams.push(parseInt(limit), offset);
    const logsResult = await pool.query(
      `SELECT 
        al.*,
        u.name as admin_name,
        u.email as admin_email
       FROM admin_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      queryParams
    );

    const logs = logsResult.rows.map(log => ({
      id: log.id,
      adminId: log.admin_id,
      adminName: log.admin_name,
      adminEmail: log.admin_email,
      action: log.action,
      targetType: log.target_type,
      targetId: log.target_id,
      details: log.details,
      ipAddress: log.ip_address,
      createdAt: log.created_at
    }));

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Clear old logs
router.delete('/logs/clear', verifyAdmin, async (req, res) => {
  try {
    const { olderThan = '90d' } = req.body;

    let daysAgo = 90;
    if (olderThan.endsWith('d')) {
      daysAgo = parseInt(olderThan);
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

    const result = await pool.query(
      `DELETE FROM admin_logs WHERE created_at < $1`,
      [dateThreshold]
    );

    console.log(`🗑️ Admin ${req.admin.name} cleared ${result.rowCount} old logs`);
    await logAdminAction(req.admin.id, 'CLEAR_LOGS', 'system', null, {
      olderThan,
      deletedCount: result.rowCount,
      ip: req.ip
    });

    res.json({
      message: 'Logs cleared successfully',
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// ============ SYSTEM SETTINGS ============
router.get('/settings', verifyAdmin, async (req, res) => {
  try {
    const settingsResult = await pool.query(
      'SELECT * FROM system_settings ORDER BY key'
    );

    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        type: row.type,
        description: row.description,
        updatedAt: row.updated_at
      };
    });

    res.json(settings);

    await logAdminAction(req.admin.id, 'VIEW_SETTINGS', 'system', null, { ip: req.ip });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update system setting
router.put('/settings/:key', verifyAdmin, async (req, res) => {
  try {
    const { value } = req.body;

    const result = await pool.query(
      `INSERT INTO system_settings (key, value, updated_at, updated_by)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3
       RETURNING *`,
      [req.params.key, value, req.admin.id]
    );

    console.log(`⚙️ Admin ${req.admin.name} updated setting: ${req.params.key} = ${value}`);
    await logAdminAction(req.admin.id, 'UPDATE_SETTING', 'system', req.params.key, {
      key: req.params.key,
      value,
      ip: req.ip
    });

    res.json({
      message: 'Setting updated successfully',
      setting: result.rows[0]
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// ============ BULK OPERATIONS ============
router.post('/users/bulk/verify', verifyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User IDs array required' });
    }

    const result = await client.query(
      `UPDATE users SET is_verified = true 
       WHERE id = ANY($1::varchar[])
       RETURNING id, name, email`,
      [userIds]
    );

    for (const user of result.rows) {
      await createNotification(
        user.id,
        null,
        'account_verified',
        'Account Verified',
        'Your account has been verified by an administrator.'
      );
    }

    await client.query('COMMIT');

    console.log(`✅ Admin ${req.admin.name} bulk verified ${result.rowCount} users`);
    await logAdminAction(req.admin.id, 'BULK_VERIFY_USERS', 'users', null, {
      count: result.rowCount,
      userIds,
      ip: req.ip
    });

    res.json({
      message: 'Users verified successfully',
      count: result.rowCount,
      users: result.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk verify error:', error);
    res.status(500).json({ error: 'Failed to verify users' });
  } finally {
    client.release();
  }
});

// ============ DATABASE BACKUP ============
router.post('/backup/create', verifyAdmin, async (req, res) => {
  try {
    const backupId = generateId();
    const timestamp = new Date().toISOString();

    const tables = ['users', 'orders', 'bids', 'notifications', 'reviews', 'payments'];
    const tableCounts = {};

    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      tableCounts[table] = parseInt(result.rows[0].count);
    }

    await pool.query(
      `INSERT INTO backups (id, created_by, table_counts, status, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [backupId, req.admin.id, JSON.stringify(tableCounts), 'completed']
    );

    console.log(`💾 Admin ${req.admin.name} created database backup: ${backupId}`);
    await logAdminAction(req.admin.id, 'CREATE_BACKUP', 'system', backupId, {
      backupId,
      tableCounts,
      ip: req.ip
    });

    res.json({
      message: 'Backup created successfully',
      backupId,
      timestamp,
      tableCounts
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// ============ REPORTS GENERATION ============
router.get('/reports/revenue', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        break;
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'IYYY-IW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    let whereConditions = ["status = 'delivered'", "assigned_driver_bid_price IS NOT NULL"];
    let queryParams = [];
    let paramCount = 1;

    if (startDate) {
      whereConditions.push(`delivered_at >= $${paramCount}`);
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      whereConditions.push(`delivered_at <= $${paramCount}`);
      queryParams.push(endDate);
      paramCount++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT 
        TO_CHAR(delivered_at, '${dateFormat}') as period,
        COUNT(*) as order_count,
        SUM(assigned_driver_bid_price) as total_revenue,
        AVG(assigned_driver_bid_price) as avg_order_value,
        MIN(assigned_driver_bid_price) as min_order_value,
        MAX(assigned_driver_bid_price) as max_order_value
       FROM orders
       ${whereClause}
       GROUP BY TO_CHAR(delivered_at, '${dateFormat}')
       ORDER BY period`,
      queryParams
    );

    const report = result.rows.map(row => ({
      period: row.period,
      orderCount: parseInt(row.order_count),
      totalRevenue: parseFloat(row.total_revenue),
      avgOrderValue: parseFloat(row.avg_order_value),
      minOrderValue: parseFloat(row.min_order_value),
      maxOrderValue: parseFloat(row.max_order_value)
    }));

    await logAdminAction(req.admin.id, 'GENERATE_REVENUE_REPORT', 'reports', null, {
      startDate,
      endDate,
      groupBy,
      ip: req.ip
    });

    res.json({
      report,
      summary: {
        totalOrders: report.reduce((sum, r) => sum + r.orderCount, 0),
        totalRevenue: report.reduce((sum, r) => sum + r.totalRevenue, 0),
        avgOrderValue: report.reduce((sum, r) => sum + r.avgOrderValue, 0) / report.length || 0
      }
    });
  } catch (error) {
    console.error('Generate revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ============ DATABASE SCHEMA - Admin Tables ============

// Note: createAdminTables is now imported from database/startup.js in server.js
// It's called during database initialization, not needed here



module.exports = router;