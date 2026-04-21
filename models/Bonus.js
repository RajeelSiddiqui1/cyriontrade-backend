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
  Timestamp
} = require('firebase/firestore');

class Bonus {
  constructor(data) {
    this.userId = data.userId;
    this.type = data.type; // signup, referral, deposit_match, promotional
    this.amount = data.amount;
    this.currency = data.currency || 'USD';
    this.status = data.status || 'pending'; // pending, active, claimed, expired
    this.description = data.description;
    this.expiresAt = data.expiresAt || null;
    this.claimedAt = data.claimedAt || null;
    this.createdAt = data.createdAt || new Date();
  }

  /**
   * Create a new bonus
   */
  static async create(bonusData) {
    const bonus = new Bonus(bonusData);
    const bonusRef = doc(collection(db, 'bonuses'));
    
    await setDoc(bonusRef, {
      ...bonus,
      createdAt: Timestamp.fromDate(bonus.createdAt),
      expiresAt: bonus.expiresAt ? Timestamp.fromDate(bonus.expiresAt) : null,
      claimedAt: bonus.claimedAt ? Timestamp.fromDate(bonus.claimedAt) : null
    });

    return { id: bonusRef.id, ...bonus };
  }

  /**
   * Get bonuses by user ID
   */
  static async getByUserId(userId) {
    try {
      const q = query(
        collection(db, 'bonuses'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const bonuses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt in memory (to avoid index requirement)
      return bonuses.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error getting bonuses:', error);
      return [];
    }
  }

  /**
   * Get active bonuses for user
   */
  static async getActiveByUserId(userId) {
    try {
      const q = query(
        collection(db, 'bonuses'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting active bonuses:', error);
      return [];
    }
  }

  /**
   * Claim a bonus
   */
  static async claim(bonusId) {
    const bonusRef = doc(db, 'bonuses', bonusId);
    const bonusDoc = await getDoc(bonusRef);
    
    if (!bonusDoc.exists()) {
      throw new Error('Bonus not found');
    }

    const bonusData = bonusDoc.data();
    
    if (bonusData.status === 'claimed') {
      throw new Error('Bonus already claimed');
    }

    if (bonusData.status === 'expired') {
      throw new Error('Bonus has expired');
    }

    await updateDoc(bonusRef, {
      status: 'claimed',
      claimedAt: Timestamp.now()
    });

    return { id: bonusId, ...bonusData, status: 'claimed' };
  }

  /**
   * Get total bonus balance for user
   */
  static async getTotalBalance(userId) {
    try {
      const activeBonuses = await this.getActiveByUserId(userId);
      return activeBonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
    } catch (error) {
      console.error('Error getting total balance:', error);
      return 0;
    }
  }

  /**
   * Get bonus statistics
   */
  static async getStats(userId) {
    try {
      const bonuses = await this.getByUserId(userId);
      
      return {
        total: bonuses.length,
        active: bonuses.filter(b => b.status === 'active').length,
        claimed: bonuses.filter(b => b.status === 'claimed').length,
        totalAmount: bonuses.reduce((sum, b) => sum + b.amount, 0),
        activeAmount: bonuses.filter(b => b.status === 'active').reduce((sum, b) => sum + b.amount, 0),
        claimedAmount: bonuses.filter(b => b.status === 'claimed').reduce((sum, b) => sum + b.amount, 0)
      };
    } catch (error) {
      console.error('Error getting bonus stats:', error);
      return {
        total: 0,
        active: 0,
        claimed: 0,
        totalAmount: 0,
        activeAmount: 0,
        claimedAmount: 0
      };
    }
  }

  /**
   * Expire old bonuses
   */
  static async expireOldBonuses() {
    const now = Timestamp.now();
    const q = query(
      collection(db, 'bonuses'),
      where('status', '==', 'active'),
      where('expiresAt', '<=', now)
    );

    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { status: 'expired' })
    );

    await Promise.all(updates);
    return updates.length;
  }
}

module.exports = Bonus;
