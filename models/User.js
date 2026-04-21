const { db } = require('../config/firebase');
const { doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');

class User {
  constructor(data) {
    this.uid = data.uid;
    this.email = data.email;
    this.displayName = data.displayName || null;
    this.photoURL = data.photoURL || null;
    this.watchlist = data.watchlist || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Find user by ID
   */
  static async findById(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return new User({ uid, ...userDoc.data() });
    } catch (error) {
      console.error('Error finding user:', error);
      throw new Error('Failed to find user');
    }
  }

  /**
   * Create new user
   */
  static async create(userData) {
    try {
      const user = new User(userData);
      
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        watchlist: user.watchlist,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update user profile
   */
  async update(updates) {
    try {
      const allowedUpdates = ['displayName', 'photoURL'];
      const filteredUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
          this[key] = updates[key];
        }
      });
      
      filteredUpdates.updatedAt = new Date().toISOString();
      this.updatedAt = filteredUpdates.updatedAt;
      
      await updateDoc(doc(db, 'users', this.uid), filteredUpdates);
      
      return this;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Get user's watchlist
   */
  getWatchlist() {
    return this.watchlist;
  }

  /**
   * Add coin to watchlist
   */
  async addToWatchlist(coinId) {
    try {
      if (this.watchlist.includes(coinId)) {
        throw new Error('Coin already in watchlist');
      }
      
      if (this.watchlist.length >= 50) {
        throw new Error('Watchlist is full. Maximum 50 coins allowed.');
      }
      
      this.watchlist.push(coinId);
      
      await updateDoc(doc(db, 'users', this.uid), {
        watchlist: this.watchlist,
        updatedAt: new Date().toISOString()
      });
      
      return this.watchlist;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      throw error;
    }
  }

  /**
   * Remove coin from watchlist
   */
  async removeFromWatchlist(coinId) {
    try {
      if (!this.watchlist.includes(coinId)) {
        throw new Error('Coin not found in watchlist');
      }
      
      this.watchlist = this.watchlist.filter(id => id !== coinId);
      
      await updateDoc(doc(db, 'users', this.uid), {
        watchlist: this.watchlist,
        updatedAt: new Date().toISOString()
      });
      
      return this.watchlist;
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      photoURL: this.photoURL,
      watchlist: this.watchlist,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Get public profile (without sensitive data)
   */
  getPublicProfile() {
    return {
      uid: this.uid,
      displayName: this.displayName,
      photoURL: this.photoURL
    };
  }
}

module.exports = User;
