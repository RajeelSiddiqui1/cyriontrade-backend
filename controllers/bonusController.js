const Bonus = require('../models/Bonus');

/**
 * GET /api/bonus/list
 * Get user's bonuses
 */
exports.getBonuses = async (req, res) => {
  try {
    const userId = req.user.uid;
    const bonuses = await Bonus.getByUserId(userId);
    res.json(bonuses || []);
  } catch (error) {
    console.error('Get bonuses error:', error);
    res.status(500).json({ error: 'Failed to get bonuses' });
  }
};

/**
 * GET /api/bonus/active
 * Get user's active bonuses
 */
exports.getActiveBonuses = async (req, res) => {
  try {
    const userId = req.user.uid;
    const bonuses = await Bonus.getActiveByUserId(userId);
    res.json(bonuses);
  } catch (error) {
    console.error('Get active bonuses error:', error);
    res.status(500).json({ error: 'Failed to get active bonuses' });
  }
};

/**
 * GET /api/bonus/balance
 * Get user's total bonus balance
 */
exports.getBonusBalance = async (req, res) => {
  try {
    const userId = req.user.uid;
    const balance = await Bonus.getTotalBalance(userId);
    res.json({ balance: balance || 0, currency: 'USD' });
  } catch (error) {
    console.error('Get bonus balance error:', error);
    res.status(500).json({ error: 'Failed to get bonus balance' });
  }
};

/**
 * GET /api/bonus/stats
 * Get bonus statistics
 */
exports.getBonusStats = async (req, res) => {
  try {
    const userId = req.user.uid;
    const stats = await Bonus.getStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Get bonus stats error:', error);
    res.status(500).json({ error: 'Failed to get bonus statistics' });
  }
};

/**
 * POST /api/bonus/claim/:bonusId
 * Claim a bonus
 */
exports.claimBonus = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { bonusId } = req.params;

    const bonus = await Bonus.claim(bonusId);

    // Verify the bonus belongs to the user
    if (bonus.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to claim this bonus' });
    }

    res.json({
      success: true,
      message: 'Bonus claimed successfully',
      bonus
    });
  } catch (error) {
    console.error('Claim bonus error:', error);
    res.status(500).json({ error: error.message || 'Failed to claim bonus' });
  }
};

/**
 * POST /api/bonus/create
 * Create a new bonus for the user
 */
exports.createBonus = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { amount, type, description, expiresAt } = req.body;

    if (!amount || !type) {
      return res.status(400).json({ error: 'Amount and type are required' });
    }

    const bonus = await Bonus.create({
      userId,
      amount: parseFloat(amount),
      type,
      description: description || `${type} bonus`,
      status: 'active',
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    res.status(201).json({
      success: true,
      message: 'Bonus created successfully',
      bonus
    });
  } catch (error) {
    console.error('Create bonus error:', error);
    res.status(500).json({ error: 'Failed to create bonus' });
  }
};

module.exports = exports;
