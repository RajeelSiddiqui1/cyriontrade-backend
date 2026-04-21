const express = require('express');
const { rateLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');
const { 
  login, 
  signup, 
  logout, 
  resetPassword, 
  getConfig,
  verifyToken: verifyUserToken
} = require('../controllers/authController');

const router = express.Router();

// Apply rate limiting (100 requests per 15 minutes for development)
router.use(rateLimiter(100, 15 * 60 * 1000));

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', logActivity('login'), login);

/**
 * POST /api/auth/signup
 * Create new user account
 */
router.post('/signup', logActivity('signup'), signup);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', logActivity('logout'), logout);

/**
 * POST /api/auth/reset-password
 * Send password reset email
 */
router.post('/reset-password', resetPassword);

/**
 * GET /api/auth/config
 * Get Firebase client configuration
 */
router.get('/config', getConfig);

/**
 * GET /api/auth/verify
 * Verify user token
 */
router.get('/verify', verifyToken, verifyUserToken);

/**
 * POST /api/auth/complete-signup
 * Complete registration with wallet connection
 */
const { completeSignup } = require('../controllers/authController');
router.post('/complete-signup', logActivity('wallet_connection'), completeSignup);

/**
 * POST /api/auth/google
 * Handle Google Sign-In
 */
const { googleSignIn, purchase } = require('../controllers/authController');
router.post('/google', googleSignIn);
router.post('/purchase', verifyToken, purchase);

module.exports = router;
