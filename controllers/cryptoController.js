const Coin = require('../models/Coin');

/**
 * Get list of coins by currency
 */
exports.getCoinList = async (req, res) => {
  try {
    const { currency = 'USD' } = req.query;

    const coins = await Coin.fetchAll(currency);
    res.json(coins);
  } catch (error) {
    console.error('Error fetching coin list:', error.message);
    res.status(500).json({
      error: 'Failed to fetch coin data',
      message: error.message
    });
  }
};

/**
 * Get single coin details
 */
exports.getSingleCoin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Coin ID is required' });
    }

    if (!Coin.isValidId(id)) {
      return res.status(400).json({ error: 'Invalid coin ID format' });
    }

    const coin = await Coin.fetchById(id);
    res.json(coin);
  } catch (error) {
    console.error('Error fetching coin:', error.message);

    if (error.message === 'Coin not found') {
      return res.status(404).json({ error: 'Coin not found' });
    }

    res.status(500).json({
      error: 'Failed to fetch coin details',
      message: error.message
    });
  }
};

/**
 * Get historical chart data
 */
exports.getHistoricalChart = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 365, currency = 'USD' } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Coin ID is required' });
    }

    if (!Coin.isValidId(id)) {
      return res.status(400).json({ error: 'Invalid coin ID format' });
    }

    const chartData = await Coin.fetchChartData(id, days, currency);
    res.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error.message);
    res.status(500).json({
      error: 'Failed to fetch chart data',
      message: error.message
    });
  }
};

/**
 * Get OHLC data
 */
exports.getOHLCData = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 1, currency = 'USD' } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Coin ID is required' });
    }

    if (!Coin.isValidId(id)) {
      return res.status(400).json({ error: 'Invalid coin ID format' });
    }

    const ohlcData = await Coin.fetchOHLCData(id, days, currency);
    res.json(ohlcData);
  } catch (error) {
    console.error('Error fetching OHLC data:', error.message);
    res.status(500).json({
      error: 'Failed to fetch OHLC data',
      message: error.message
    });
  }
};

/**
 * Get trending coins
 */
exports.getTrendingCoins = async (req, res) => {
  try {
    const { currency = 'USD' } = req.query;

    const coins = await Coin.fetchTrending(currency);
    res.json(coins);
  } catch (error) {
    console.error('Error fetching trending coins:', error.message);
    res.status(500).json({
      error: 'Failed to fetch trending coins',
      message: error.message
    });
  }
};
