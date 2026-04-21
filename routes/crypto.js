const express = require('express');
const { rateLimiter } = require('../middleware/rateLimiter');
const {
  getCoinList,
  getSingleCoin,
  getHistoricalChart,
  getOHLCData,
  getTrendingCoins
} = require('../controllers/cryptoController');

const router = express.Router();

// Apply rate limiting (100 requests per 15 minutes)
router.use(rateLimiter(100, 15 * 60 * 1000));

/**
 * GET /api/crypto/coins
 * Get list of coins by currency
 */
router.get('/coins', getCoinList);

/**
 * GET /api/crypto/coin/:id
 * Get single coin details
 */
router.get('/coin/:id', getSingleCoin);

/**
 * GET /api/crypto/chart/:id
 * Get historical chart data for a coin
 */
router.get('/chart/:id', getHistoricalChart);

/**
 * GET /api/crypto/ohlc/:id
 * Get OHLC data for a coin
 */
router.get('/ohlc/:id', getOHLCData);

/**
 * GET /api/crypto/trending
 * Get trending coins
 */
router.get('/trending', getTrendingCoins);

module.exports = router;
