const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getWatchlist, addCoin, removeCoin } = require('../controllers/watchlistController');
const { rateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(rateLimiter(100, 15 * 60 * 1000));

router.get('/', verifyToken, getWatchlist);
router.post('/', verifyToken, addCoin);
router.delete('/:coinId', verifyToken, removeCoin);

module.exports = router;
