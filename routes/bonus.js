const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const {
  getBonuses,
  getActiveBonuses,
  getBonusBalance,
  getBonusStats,
  claimBonus,
  createBonus
} = require('../controllers/bonusController');

// Apply rate limiting
router.use(rateLimiter(100, 15 * 60 * 1000));

// Get all bonuses
router.get('/list', verifyToken, getBonuses);

// Get active bonuses
router.get('/active', verifyToken, getActiveBonuses);

// Get bonus balance
router.get('/balance', verifyToken, getBonusBalance);

// Get bonus statistics
router.get('/stats', verifyToken, getBonusStats);

// Claim a bonus
router.post('/claim/:bonusId', verifyToken, claimBonus);

// Create a bonus
router.post('/create', verifyToken, createBonus);

module.exports = router;
