const { db } = require('../config/firebase');
const { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy } = require('firebase/firestore');

class Ad {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.imageUrl = data.imageUrl || null;
    this.buttonText = data.buttonText || 'Learn More';
    this.buttonLink = data.buttonLink;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.displayOrder = data.displayOrder || 0;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Get all active ads
   */
  static async getActiveAds() {
    try {
      const adsRef = collection(db, 'ads');
      const q = query(adsRef, where('isActive', '==', true), orderBy('displayOrder', 'asc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => new Ad({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting active ads:', error);
      throw new Error('Failed to fetch ads');
    }
  }

  /**
   * Get all ads (admin)
   */
  static async getAllAds() {
    try {
      const adsRef = collection(db, 'ads');
      const q = query(adsRef, orderBy('displayOrder', 'asc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => new Ad({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all ads:', error);
      throw new Error('Failed to fetch ads');
    }
  }

  /**
   * Get ad by ID
   */
  static async findById(id) {
    try {
      const adDoc = await getDoc(doc(db, 'ads', id));
      
      if (!adDoc.exists()) {
        return null;
      }
      
      return new Ad({ id, ...adDoc.data() });
    } catch (error) {
      console.error('Error finding ad:', error);
      throw new Error('Failed to find ad');
    }
  }

  /**
   * Create new ad
   */
  static async create(adData) {
    try {
      const adRef = doc(collection(db, 'ads'));
      const ad = new Ad({ id: adRef.id, ...adData });
      
      await setDoc(adRef, {
        title: ad.title,
        description: ad.description,
        imageUrl: ad.imageUrl,
        buttonText: ad.buttonText,
        buttonLink: ad.buttonLink,
        isActive: ad.isActive,
        displayOrder: ad.displayOrder,
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt
      });
      
      return ad;
    } catch (error) {
      console.error('Error creating ad:', error);
      throw new Error('Failed to create ad');
    }
  }

  /**
   * Update ad
   */
  async update(updates) {
    try {
      const allowedUpdates = ['title', 'description', 'imageUrl', 'buttonText', 'buttonLink', 'isActive', 'displayOrder'];
      const filteredUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
          this[key] = updates[key];
        }
      });
      
      filteredUpdates.updatedAt = new Date().toISOString();
      this.updatedAt = filteredUpdates.updatedAt;
      
      await updateDoc(doc(db, 'ads', this.id), filteredUpdates);
      
      return this;
    } catch (error) {
      console.error('Error updating ad:', error);
      throw new Error('Failed to update ad');
    }
  }

  /**
   * Delete ad
   */
  async delete() {
    try {
      await deleteDoc(doc(db, 'ads', this.id));
      return true;
    } catch (error) {
      console.error('Error deleting ad:', error);
      throw new Error('Failed to delete ad');
    }
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      imageUrl: this.imageUrl,
      buttonText: this.buttonText,
      buttonLink: this.buttonLink,
      isActive: this.isActive,
      displayOrder: this.displayOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Ad;
