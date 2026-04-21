const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getProfile, updateProfile } = require('../controllers/userController');
const { rateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(rateLimiter(50, 15 * 60 * 1000));

router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);

module.exports = router;
