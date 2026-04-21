const { db } = require('../config/firebase');
const { doc, getDoc, updateDoc } = require('firebase/firestore');

/**
 * Get user profile
 */
exports.getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        error: 'User authentication failed'
      });
    }

    const userRef = doc(db, 'users', req.user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Create user document if it doesn't exist
      const { Timestamp, setDoc } = require('firebase/firestore');

      const userData = {
        userId: req.user.uid,
        email: req.user.email,
        displayName: req.user.displayName || req.user.email?.split('@')[0] || 'User',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        walletConnected: false,
        registrationCompleted: true
      };

      await setDoc(userRef, userData);

      return res.json({
        uid: req.user.uid,
        ...userData
      });
    }

    res.json({
      uid: req.user.uid,
      ...userDoc.data()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile. Please try again.'
    });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        error: 'User authentication failed'
      });
    }

    const { displayName, photoURL, walletAddress, walletConnected } = req.body;

    if (!displayName && !photoURL && walletAddress === undefined && walletConnected === undefined) {
      return res.status(400).json({
        error: 'At least one field is required'
      });
    }

    const updateData = {};

    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.trim().length === 0) {
        return res.status(400).json({
          error: 'Display name cannot be empty'
        });
      }
      if (displayName.length > 50) {
        return res.status(400).json({
          error: 'Display name must be less than 50 characters'
        });
      }
      updateData.displayName = displayName.trim();
    }

    if (photoURL !== undefined) {
      if (typeof photoURL !== 'string') {
        return res.status(400).json({
          error: 'Photo URL must be a string'
        });
      }
      if (photoURL && !photoURL.match(/^https?:\/\/.+/)) {
        return res.status(400).json({
          error: 'Invalid photo URL format'
        });
      }
      updateData.photoURL = photoURL;
    }

    // Handle wallet disconnection
    if (walletAddress === null || walletConnected === false) {
      updateData.walletAddress = null;
      updateData.walletConnected = false;
    }

    updateData.updatedAt = new Date().toISOString();

    await updateDoc(doc(db, 'users', req.user.uid), updateData);

    res.json({
      message: 'Profile updated successfully',
      data: updateData
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile. Please try again.'
    });
  }
};
