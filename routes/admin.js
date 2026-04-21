const express = require('express');
const { verifyToken } = require('../middleware/auth');
const UserActivity = require('../models/UserActivity');

const router = express.Router();

/**
 * GET /api/admin/activities
 * Get recent user activities (admin only)
 */
router.get('/activities', verifyToken, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const activities = await UserActivity.getRecent(parseInt(limit));
    
    res.json({
      success: true,
      activities,
      total: activities.length
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * GET /api/admin/activities/user/:userId
 * Get activities for specific user (admin only)
 */
router.get('/activities/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const userData = await UserActivity.getByUserId(userId, parseInt(limit));
    
    res.json({
      success: true,
      ...userData,
      userId,
      total: userData.activities.length
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
});

/**
 * GET /api/admin/users
 * Get all users with activity summaries (admin only)
 */
router.get('/users', verifyToken, async (req, res) => {
  try {
    const users = await UserActivity.getAllUsers();
    
    res.json({
      success: true,
      users,
      total: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/stats/login
 * Get login statistics (admin only)
 */
router.get('/stats/login', verifyToken, async (req, res) => {
  try {
    const stats = await UserActivity.getLoginStats();
    
    if (!stats) {
      return res.status(500).json({ error: 'Failed to generate login statistics' });
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching login stats:', error);
    res.status(500).json({ error: 'Failed to fetch login statistics' });
  }
});

/**
 * GET /api/admin/stats/devices
 * Get device statistics (admin only)
 */
router.get('/stats/devices', verifyToken, async (req, res) => {
  try {
    const deviceStats = await UserActivity.getDeviceStats();
    
    res.json({
      success: true,
      deviceStats
    });
  } catch (error) {
    console.error('Error fetching device stats:', error);
    res.status(500).json({ error: 'Failed to fetch device statistics' });
  }
});

module.exports = router;