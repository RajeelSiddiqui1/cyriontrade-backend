const Ad = require('../models/Ad');

/**
 * Get all active ads (public)
 */
exports.getActiveAds = async (req, res) => {
  try {
    const ads = await Ad.getActiveAds();
    res.json({ success: true, ads });
  } catch (error) {
    console.error('Get active ads error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ads' 
    });
  }
};
