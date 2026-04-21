const { db } = require('../config/firebase');
const { doc, getDoc, updateDoc } = require('firebase/firestore');

/**
 * Get user's watchlist
 */
exports.getWatchlist = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ 
        error: 'User authentication failed' 
      });
    }

    const userDoc = await getDoc(doc(db, 'users', req.user.uid));
    
    if (!userDoc.exists()) {
      return res.status(404).json({ 
        error: 'User profile not found' 
      });
    }

    const watchlist = userDoc.data().watchlist || [];
    res.json({ 
      watchlist,
      count: watchlist.length 
    });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch watchlist. Please try again.' 
    });
  }
};

/**
 * Add coin to watchlist
 */
exports.addCoin = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ 
        error: 'User authentication failed' 
      });
    }

    const { coinId } = req.body;
    
    if (!coinId || typeof coinId !== 'string' || coinId.trim() === '') {
      return res.status(400).json({ 
        error: 'Coin ID is required' 
      });
    }

    const userRef = doc(db, 'users', req.user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ 
        error: 'User profile not found' 
      });
    }

    const watchlist = userDoc.data().watchlist || [];
    
    if (watchlist.includes(coinId)) {
      return res.status(400).json({ 
        error: 'This coin is already in your watchlist' 
      });
    }

    if (watchlist.length >= 50) {
      return res.status(400).json({ 
        error: 'Watchlist is full. Maximum 50 coins allowed.' 
      });
    }

    watchlist.push(coinId);
    await updateDoc(userRef, { 
      watchlist,
      updatedAt: new Date().toISOString()
    });

    res.json({ 
      message: 'Coin added to watchlist successfully', 
      watchlist,
      count: watchlist.length
    });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({ 
      error: 'Failed to add coin to watchlist. Please try again.' 
    });
  }
};

/**
 * Remove coin from watchlist
 */
exports.removeCoin = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ 
        error: 'User authentication failed' 
      });
    }

    const { coinId } = req.params;
    
    if (!coinId || coinId.trim() === '') {
      return res.status(400).json({ 
        error: 'Coin ID is required' 
      });
    }
    
    const userRef = doc(db, 'users', req.user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return res.status(404).json({ 
        error: 'User profile not found' 
      });
    }

    const watchlist = userDoc.data().watchlist || [];
    
    if (!watchlist.includes(coinId)) {
      return res.status(404).json({ 
        error: 'Coin not found in your watchlist' 
      });
    }

    const updatedWatchlist = watchlist.filter(id => id !== coinId);

    await updateDoc(userRef, { 
      watchlist: updatedWatchlist,
      updatedAt: new Date().toISOString()
    });

    res.json({ 
      message: 'Coin removed from watchlist successfully', 
      watchlist: updatedWatchlist,
      count: updatedWatchlist.length
    });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({ 
      error: 'Failed to remove coin from watchlist. Please try again.' 
    });
  }
};
