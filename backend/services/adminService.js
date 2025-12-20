const pool = require('../config/db');

/**
 * Log admin actions to admin_logs table
 * @param {string} adminId - Admin user ID
 * @param {string} action - Action performed (e.g., 'USER_SUSPEND', 'ORDER_UPDATE')
 * @param {string} targetType - Type of target (e.g., 'user', 'order', 'setting')
 * @param {string} targetId - ID of the target entity
 * @param {object} details - Additional details about the action
 * @returns {Promise<void>}
 */
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

module.exports = {
    logAdminAction
};
