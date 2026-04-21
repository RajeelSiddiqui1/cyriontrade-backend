const { db } = require('../config/firebase');
const { 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  increment
} = require('firebase/firestore');

class UserActivity {
  constructor(data) {
    this.userId = data.userId || null;
    this.email = data.email || null;
    this.action = data.action; // 'login', 'logout', 'signup', 'failed_login'
    this.ipAddress = data.ipAddress || null;
    this.userAgent = data.userAgent || null;
    this.deviceInfo = data.deviceInfo || null;
    this.timestamp = data.timestamp || serverTimestamp();
    this.success = data.success !== undefined ? data.success : true;
    this.errorMessage = data.errorMessage || null;
  }

  /**
   * Get Firestore collection reference for user activities
   */
  static getCollection() {
    return collection(db, 'userActivities');
  }

  /**
   * Get user document reference
   */
  static getUserDoc(userId) {
    return doc(db, 'userActivities', userId);
  }

  /**
   * Log user activity to Firestore (per user document)
   */
  static async log(activityData) {
    try {
      const activity = new UserActivity(activityData);
      
      // If no userId, create a guest activity log
      const userId = activity.userId || 'guest';
      const userDocRef = this.getUserDoc(userId);
      
      // Create activity entry
      const activityEntry = {
        action: activity.action,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        deviceInfo: activity.deviceInfo,
        timestamp: new Date(), // Use regular Date for easier handling
        success: activity.success,
        errorMessage: activity.errorMessage
      };

      // Get existing user document
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // Update existing user document
        const existingData = userDoc.data();
        const activities = existingData.activities || [];
        
        // Add new activity to the beginning of the array
        activities.unshift(activityEntry);
        
        // Keep only last 100 activities per user to prevent document from getting too large
        if (activities.length > 100) {
          activities.splice(100);
        }

        // Update statistics
        const stats = existingData.stats || {};
        stats.totalActivities = (stats.totalActivities || 0) + 1;
        stats.lastActivity = new Date();
        
        if (activity.action === 'login' || activity.action === 'failed_login') {
          if (activity.success) {
            stats.successfulLogins = (stats.successfulLogins || 0) + 1;
            stats.lastSuccessfulLogin = new Date();
          } else {
            stats.failedLogins = (stats.failedLogins || 0) + 1;
            stats.lastFailedLogin = new Date();
          }
        }

        // Track unique IPs and devices
        const uniqueIPs = new Set(existingData.uniqueIPs || []);
        if (activity.ipAddress) {
          uniqueIPs.add(activity.ipAddress);
        }

        // Track unique devices
        const uniqueDevices = existingData.uniqueDevices || [];
        if (activity.deviceInfo) {
          const deviceSignature = `${activity.deviceInfo.deviceType}-${activity.deviceInfo.os}-${activity.deviceInfo.browser}`;
          const existingDevice = uniqueDevices.find(d => d.signature === deviceSignature);
          
          if (!existingDevice) {
            uniqueDevices.push({
              signature: deviceSignature,
              deviceType: activity.deviceInfo.deviceType,
              os: activity.deviceInfo.os,
              browser: activity.deviceInfo.browser,
              firstSeen: new Date(),
              lastSeen: new Date()
            });
          } else {
            existingDevice.lastSeen = new Date();
          }
        }

        await updateDoc(userDocRef, {
          activities,
          stats,
          uniqueIPs: Array.from(uniqueIPs),
          uniqueDevices,
          email: activity.email || existingData.email,
          updatedAt: new Date()
        });
      } else {
        // Create new user document
        const uniqueDevices = [];
        if (activity.deviceInfo) {
          const deviceSignature = `${activity.deviceInfo.deviceType}-${activity.deviceInfo.os}-${activity.deviceInfo.browser}`;
          uniqueDevices.push({
            signature: deviceSignature,
            deviceType: activity.deviceInfo.deviceType,
            os: activity.deviceInfo.os,
            browser: activity.deviceInfo.browser,
            firstSeen: new Date(),
            lastSeen: new Date()
          });
        }

        const newUserData = {
          userId: userId,
          email: activity.email,
          activities: [activityEntry],
          stats: {
            totalActivities: 1,
            successfulLogins: activity.action === 'login' && activity.success ? 1 : 0,
            failedLogins: activity.action === 'failed_login' ? 1 : 0,
            lastActivity: new Date(),
            lastSuccessfulLogin: activity.action === 'login' && activity.success ? new Date() : null,
            lastFailedLogin: activity.action === 'failed_login' ? new Date() : null
          },
          uniqueIPs: activity.ipAddress ? [activity.ipAddress] : [],
          uniqueDevices,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await setDoc(userDocRef, newUserData);
      }
      
      // Also log to console for development
      console.log(`[USER ACTIVITY] ${activity.action.toUpperCase()} - ${activity.email || 'Unknown'} from ${activity.ipAddress}`);
      
      return { userId, ...activityEntry };
    } catch (error) {
      console.error('Error logging user activity to Firestore:', error);
      // Don't throw error to prevent breaking the main flow
      return null;
    }
  }

  /**
   * Get activities by user ID from Firestore
   */
  static async getByUserId(userId, limitCount = 50) {
    try {
      const userDocRef = this.getUserDoc(userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return {
          activities: [],
          stats: null,
          userInfo: null
        };
      }

      const userData = userDoc.data();
      const activities = userData.activities || [];
      
      // Return limited activities (already sorted by timestamp desc when stored)
      return {
        activities: activities.slice(0, limitCount),
        stats: userData.stats || {},
        userInfo: {
          userId: userData.userId,
          email: userData.email,
          uniqueIPs: userData.uniqueIPs || [],
          uniqueDevices: userData.uniqueDevices || [],
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        }
      };
    } catch (error) {
      console.error('Error getting activities by user ID from Firestore:', error);
      return {
        activities: [],
        stats: null,
        userInfo: null
      };
    }
  }

  /**
   * Get recent activities from all users
   */
  static async getRecent(limitCount = 100) {
    try {
      const activitiesRef = this.getCollection();
      const querySnapshot = await getDocs(activitiesRef);
      
      const allActivities = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const userActivities = userData.activities || [];
        
        // Add userId to each activity and flatten
        userActivities.forEach(activity => {
          allActivities.push({
            userId: userData.userId,
            email: userData.email,
            ...activity
          });
        });
      });
      
      // Sort by timestamp descending and limit
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return allActivities.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting recent activities from Firestore:', error);
      return [];
    }
  }

  /**
   * Get login statistics from all user documents
   */
  static async getLoginStats() {
    try {
      const activitiesRef = this.getCollection();
      const querySnapshot = await getDocs(activitiesRef);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = {
        totalUsers: 0,
        totalLogins: 0,
        successfulLogins: 0,
        failedLogins: 0,
        uniqueIPs: new Set(),
        todayLogins: 0,
        weekLogins: 0,
        monthLogins: 0,
        activeUsers: {
          today: new Set(),
          week: new Set(),
          month: new Set()
        }
      };

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        stats.totalUsers++;
        
        // Aggregate stats from user document
        const userStats = userData.stats || {};
        stats.totalLogins += userStats.totalActivities || 0;
        stats.successfulLogins += userStats.successfulLogins || 0;
        stats.failedLogins += userStats.failedLogins || 0;
        
        // Add unique IPs
        if (userData.uniqueIPs) {
          userData.uniqueIPs.forEach(ip => stats.uniqueIPs.add(ip));
        }
        
        // Check activities for time-based stats
        const activities = userData.activities || [];
        activities.forEach(activity => {
          const activityDate = new Date(activity.timestamp);
          
          if (activity.action === 'login' || activity.action === 'failed_login') {
            if (activityDate >= today) {
              stats.todayLogins++;
              stats.activeUsers.today.add(userData.userId);
            }
            
            if (activityDate >= thisWeek) {
              stats.weekLogins++;
              stats.activeUsers.week.add(userData.userId);
            }
            
            if (activityDate >= thisMonth) {
              stats.monthLogins++;
              stats.activeUsers.month.add(userData.userId);
            }
          }
        });
      });

      return {
        totalUsers: stats.totalUsers,
        totalLogins: stats.totalLogins,
        successfulLogins: stats.successfulLogins,
        failedLogins: stats.failedLogins,
        uniqueIPs: stats.uniqueIPs.size,
        todayLogins: stats.todayLogins,
        weekLogins: stats.weekLogins,
        monthLogins: stats.monthLogins,
        activeUsers: {
          today: stats.activeUsers.today.size,
          week: stats.activeUsers.week.size,
          month: stats.activeUsers.month.size
        }
      };
    } catch (error) {
      console.error('Error getting login stats from Firestore:', error);
      return null;
    }
  }

  /**
   * Get all users with their activity summaries
   */
  static async getAllUsers() {
    try {
      const activitiesRef = this.getCollection();
      const querySnapshot = await getDocs(activitiesRef);
      
      const users = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          userId: userData.userId,
          email: userData.email,
          stats: userData.stats || {},
          uniqueIPs: userData.uniqueIPs || [],
          uniqueDevices: userData.uniqueDevices || [],
          recentActivities: (userData.activities || []).slice(0, 5), // Last 5 activities
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        });
      });
      
      // Sort by last activity
      users.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      return users;
    } catch (error) {
      console.error('Error getting all users from Firestore:', error);
      return [];
    }
  }

  /**
   * Get device statistics across all users
   */
  static async getDeviceStats() {
    try {
      const activitiesRef = this.getCollection();
      const querySnapshot = await getDocs(activitiesRef);
      
      const deviceStats = {
        totalDevices: 0,
        deviceTypes: {
          mobile: 0,
          desktop: 0,
          tablet: 0,
          unknown: 0
        },
        operatingSystems: {},
        browsers: {},
        deviceBreakdown: []
      };

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const uniqueDevices = userData.uniqueDevices || [];
        
        uniqueDevices.forEach(device => {
          deviceStats.totalDevices++;
          
          // Count device types
          const deviceType = device.deviceType || 'unknown';
          if (deviceStats.deviceTypes[deviceType] !== undefined) {
            deviceStats.deviceTypes[deviceType]++;
          } else {
            deviceStats.deviceTypes.unknown++;
          }
          
          // Count operating systems
          const os = device.os || 'Unknown';
          deviceStats.operatingSystems[os] = (deviceStats.operatingSystems[os] || 0) + 1;
          
          // Count browsers
          const browser = device.browser || 'Unknown';
          deviceStats.browsers[browser] = (deviceStats.browsers[browser] || 0) + 1;
          
          // Add to detailed breakdown
          deviceStats.deviceBreakdown.push({
            userId: userData.userId,
            email: userData.email,
            deviceType: device.deviceType,
            os: device.os,
            browser: device.browser,
            firstSeen: device.firstSeen,
            lastSeen: device.lastSeen
          });
        });
      });

      // Sort breakdown by last seen
      deviceStats.deviceBreakdown.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

      return deviceStats;
    } catch (error) {
      console.error('Error getting device stats from Firestore:', error);
      return null;
    }
  }

  /**
   * Convert to JSON for Firestore
   */
  toJSON() {
    return {
      userId: this.userId,
      email: this.email,
      action: this.action,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      deviceInfo: this.deviceInfo,
      timestamp: this.timestamp,
      success: this.success,
      errorMessage: this.errorMessage
    };
  }
}

module.exports = UserActivity;