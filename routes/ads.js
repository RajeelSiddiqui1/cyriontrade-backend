const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');

// Public route - get active ads
router.get('/active', adController.getActiveAds);

module.exports = router;
