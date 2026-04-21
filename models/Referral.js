const { db } = require('../config/firebase');
const { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  limit,
  Timestamp
} = require('firebase/firestore');

class Referral {
  constructor(data) {
    this.referrerId = data.referrerId;
    this.referredUserId = data.referredUserId;
    this.referralCode = data.referralCode;
    this.status = data.status || 'pending'; // pending, completed, expired
    this.bonusAmount = data.bonusAmount || 0;
    this.bonusClaimed = data.bonusClaimed || false;
    this.createdAt = data.createdAt || new Date();
    this.completedAt = data.completedAt || null;
  }

  /**
   * Create a new referral
   */
  static async create(referralData) {
    const referral = new Referral(referralData);
    const referralRef = doc(collection(db, 'referrals'));
    
    await setDoc(referralRef, {
      ...referral,
      createdAt: Timestamp.fromDate(referral.createdAt),
      completedAt: referral.completedAt ? Timestamp.fromDate(referral.completedAt) : null
    });

    return { id: referralRef.id, ...referral };
  }

  /**
   * Get referrals by referrer ID
   */
  static async getByReferrerId(referrerId) {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referrerId', '==', referrerId)
      );

      const snapshot = await getDocs(q);
      const referrals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt in memory (to avoid index requirement)
      return referrals.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error getting referrals:', error);
      return [];
    }
  }

  /**
   * Get referral by referred user ID
   */
  static async getByReferredUserId(referredUserId) {
    const q = query(
      collection(db, 'referrals'),
      where('referredUserId', '==', referredUserId),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Update referral status
   */
  static async updateStatus(referralId, status, bonusAmount = 0) {
    const referralRef = doc(db, 'referrals', referralId);
    
    const updateData = {
      status,
      bonusAmount,
      completedAt: status === 'completed' ? Timestamp.now() : null
    };

    await updateDoc(referralRef, updateData);
    return updateData;
  }

  /**
   * Mark bonus as claimed
   */
  static async claimBonus(referralId) {
    const referralRef = doc(db, 'referrals', referralId);
    await updateDoc(referralRef, {
      bonusClaimed: true,
      claimedAt: Timestamp.now()
    });
  }

  /**
   * Get referral statistics
   */
  static async getStats(referrerId) {
    try {
      const referrals = await this.getByReferrerId(referrerId);
      
      return {
        total: referrals.length,
        completed: referrals.filter(r => r.status === 'completed').length,
        pending: referrals.filter(r => r.status === 'pending').length,
        totalEarned: referrals.reduce((sum, r) => sum + (r.bonusAmount || 0), 0),
        totalClaimed: referrals.filter(r => r.bonusClaimed).reduce((sum, r) => sum + (r.bonusAmount || 0), 0)
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return {
        total: 0,
        completed: 0,
        pending: 0,
        totalEarned: 0,
        totalClaimed: 0
      };
    }
  }
}

module.exports = Referral;
