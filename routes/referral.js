const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');
const {
  getReferralCode,
  getReferralStats,
  getReferrals,
  applyReferralCode,
  completeReferral
} = require('../controllers/referralController');

// Apply rate limiting
router.use(rateLimiter(100, 15 * 60 * 1000));

// Get user's referral code
router.get('/code', verifyToken, getReferralCode);

// Get referral statistics
router.get('/stats', verifyToken, getReferralStats);

// Get user's referrals
router.get('/list', verifyToken, getReferrals);

// Apply referral code (during signup)
router.post('/apply', applyReferralCode);

// Complete referral (when referred user completes action)
router.post('/complete', verifyToken, completeReferral);

module.exports = router;
