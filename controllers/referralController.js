const Referral = require('../models/Referral');
const Bonus = require('../models/Bonus');
const { db } = require('../config/firebase');
const { collection, doc, getDoc, getDocs, updateDoc, query, where } = require('firebase/firestore');

/**
 * Generate unique referral code
 */
const generateReferralCode = (userId) => {
  const prefix = 'CYR';
  const userPart = userId.substring(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${userPart}${random}`;
};

/**
 * GET /api/referral/code
 * Get or create user's referral code
 */
exports.getReferralCode = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userEmail = req.user.email;
    
    // Check if user already has a referral code
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    let userData;
    
    if (!userDoc.exists()) {
      // Create user document if it doesn't exist
      const { Timestamp, setDoc } = require('firebase/firestore');
      const referralCode = generateReferralCode(userId);
      
      userData = {
        userId: userId,
        email: userEmail,
        displayName: userEmail?.split('@')[0] || 'User',
        referralCode: referralCode,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        walletConnected: false,
        registrationCompleted: true
      };
      
      await setDoc(userRef, userData);
    } else {
      userData = userDoc.data();
      
      // Generate referral code if doesn't exist
      if (!userData.referralCode) {
        const referralCode = generateReferralCode(userId);
        await updateDoc(userRef, { referralCode });
        userData.referralCode = referralCode;
      }
    }

    res.json({
      referralCode: userData.referralCode,
      referralLink: `${process.env.CLIENT_URL || 'http://localhost:3000'}/?ref=${userData.referralCode}`
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
};

/**
 * GET /api/referral/stats
 * Get referral statistics
 */
exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.user.uid;
    const stats = await Referral.getStats(userId);
    res.json(stats || {
      total: 0,
      completed: 0,
      pending: 0,
      totalEarned: 0,
      totalClaimed: 0
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Failed to get referral statistics' });
  }
};

/**
 * GET /api/referral/list
 * Get user's referrals
 */
exports.getReferrals = async (req, res) => {
  try {
    const userId = req.user.uid;
    const referrals = await Referral.getByReferrerId(userId);
    res.json(referrals);
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ error: 'Failed to get referrals' });
  }
};

/**
 * POST /api/referral/apply
 * Apply referral code during signup
 */
exports.applyReferralCode = async (req, res) => {
  try {
    const { referralCode, newUserId } = req.body;

    if (!referralCode || !newUserId) {
      return res.status(400).json({ error: 'Referral code and user ID required' });
    }

    // Find referrer by code
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referralCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    const referrerDoc = snapshot.docs[0];
    const referrerId = referrerDoc.id;

    // Don't allow self-referral
    if (referrerId === newUserId) {
      return res.status(400).json({ error: 'Cannot use your own referral code' });
    }

    // Create referral record
    const referral = await Referral.create({
      referrerId,
      referredUserId: newUserId,
      referralCode,
      status: 'pending',
      bonusAmount: 0
    });

    // Create sign-up bonus for new user
    await Bonus.create({
      userId: newUserId,
      type: 'signup',
      amount: 10,
      currency: 'USD',
      status: 'active',
      description: 'Welcome bonus for signing up!'
    });

    res.json({
      success: true,
      message: 'Referral applied successfully',
      referral
    });
  } catch (error) {
    console.error('Apply referral code error:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  }
};

/**
 * POST /api/referral/complete
 * Complete referral (when referred user completes required action)
 */
exports.completeReferral = async (req, res) => {
  try {
    const { referredUserId } = req.body;

    if (!referredUserId) {
      return res.status(400).json({ error: 'Referred user ID required' });
    }

    // Find referral
    const referral = await Referral.getByReferredUserId(referredUserId);

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    if (referral.status === 'completed') {
      return res.status(400).json({ error: 'Referral already completed' });
    }

    // Update referral status
    const bonusAmount = 25; // $25 referral bonus
    await Referral.updateStatus(referral.id, 'completed', bonusAmount);

    // Create bonus for referrer
    await Bonus.create({
      userId: referral.referrerId,
      type: 'referral',
      amount: bonusAmount,
      currency: 'USD',
      status: 'active',
      description: `Referral bonus for inviting a friend!`
    });

    res.json({
      success: true,
      message: 'Referral completed successfully',
      bonusAmount
    });
  } catch (error) {
    console.error('Complete referral error:', error);
    res.status(500).json({ error: 'Failed to complete referral' });
  }
};

module.exports = exports;
