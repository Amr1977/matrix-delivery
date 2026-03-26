const express = require('express');
const router = express.Router();
const { getNotificationService } = require('../services/notificationService');
const { verifyToken } = require('../middleware/auth');

// Get all notifications for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const notificationService = getNotificationService();
    const notifications = await notificationService.getNotificationsByUser(req.user.userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.post('/:id/read', verifyToken, async (req, res) => {
  try {
    const notificationService = getNotificationService();
    await notificationService.markAsRead(req.params.id, req.user.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/read-all', verifyToken, async (req, res) => {
  try {
    const notificationService = getNotificationService();
    await notificationService.markAllAsRead(req.user.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const notificationService = getNotificationService();
    await notificationService.deleteNotification(req.params.id, req.user.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
