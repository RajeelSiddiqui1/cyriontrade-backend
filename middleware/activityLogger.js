const UserActivity = require('../models/UserActivity');
const axios = require('axios');

/**
 * Get client IP address from request
 */
const getClientIP = (req) => {
  // Check for forwarded IPs first (most reliable for real public IPs)
  let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.headers['x-client-ip'] ||
           req.headers['cf-connecting-ip'] || // Cloudflare
           req.headers['x-forwarded'] ||
           req.headers['forwarded-for'] ||
           req.headers['forwarded'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';

  // Clean up IPv6-mapped IPv4 addresses
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.substring(7); // Remove '::ffff:' prefix
  }

  // Handle localhost variations
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    // In development, try to get a more meaningful identifier
    // You could also use a service to get the real public IP
    return 'localhost';
  }

  // Validate IP format (basic check)
  if (ip && ip !== 'unknown') {
    // IPv4 regex pattern
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 regex pattern (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
      return ip;
    }
  }

  return ip || 'unknown';
};

/**
 * Get user agent from request
 */
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Parse device information from user agent
 */
const parseDeviceInfo = (userAgent) => {
  if (!userAgent || userAgent === 'unknown') {
    return {
      deviceType: 'unknown',
      os: 'unknown',
      browser: 'unknown',
      isMobile: false,
      isTablet: false,
      isDesktop: false
    };
  }

  const ua = userAgent.toLowerCase();
  
  // Device Type Detection
  let deviceType = 'desktop';
  let isMobile = false;
  let isTablet = false;
  let isDesktop = true;

  // Mobile detection
  if (/mobile|android|iphone|ipod|blackberry|windows phone|opera mini/i.test(ua)) {
    deviceType = 'mobile';
    isMobile = true;
    isDesktop = false;
  }
  
  // Tablet detection
  if (/tablet|ipad|kindle|silk|playbook/i.test(ua)) {
    deviceType = 'tablet';
    isTablet = true;
    isMobile = false;
    isDesktop = false;
  }

  // Operating System Detection
  let os = 'unknown';
  if (/windows nt/i.test(ua)) {
    if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
    else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1';
    else if (/windows nt 6.2/i.test(ua)) os = 'Windows 8';
    else if (/windows nt 6.1/i.test(ua)) os = 'Windows 7';
    else os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  } else if (/android/i.test(ua)) {
    const androidMatch = ua.match(/android (\d+\.?\d*)/);
    os = androidMatch ? `Android ${androidMatch[1]}` : 'Android';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    const iosMatch = ua.match(/os (\d+)_(\d+)/);
    os = iosMatch ? `iOS ${iosMatch[1]}.${iosMatch[2]}` : 'iOS';
  }

  // Browser Detection
  let browser = 'unknown';
  if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) {
    browser = 'Chrome';
  } else if (/firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/opera|opr/i.test(ua)) {
    browser = 'Opera';
  } else if (/msie|trident/i.test(ua)) {
    browser = 'Internet Explorer';
  }

  return {
    deviceType,
    os,
    browser,
    isMobile,
    isTablet,
    isDesktop,
    rawUserAgent: userAgent
  };
};

/**
 * Get real public IP address (for development/testing)
 * This function can be used to get the server's public IP when testing locally
 */
const getRealPublicIP = async () => {
  try {
    // Try multiple services in case one is down
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip'
    ];

    for (const service of services) {
      try {
        const response = await axios.get(service, { timeout: 3000 });
        
        if (service.includes('ipify')) {
          return response.data.ip;
        } else if (service.includes('ipapi')) {
          return response.data.ip;
        } else if (service.includes('httpbin')) {
          return response.data.origin;
        }
      } catch (error) {
        continue; // Try next service
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting real public IP:', error);
    return null;
  }
};

/**
 * Log user activity middleware
 */
const logActivity = (action) => {
  return async (req, res, next) => {
    try {
      let ipAddress = getClientIP(req);
      const userAgent = getUserAgent(req);
      const deviceInfo = parseDeviceInfo(userAgent);
      
      // If we're in development and got localhost, try to get real public IP
      if (ipAddress === 'localhost' && process.env.NODE_ENV === 'development') {
        const realIP = await getRealPublicIP();
        if (realIP) {
          ipAddress = `${realIP} (dev)`;
        }
      }
      
      // Store activity data in request for later use
      req.activityData = {
        action,
        ipAddress,
        userAgent,
        deviceInfo,
        userId: req.user?.uid || null,
        email: req.user?.email || req.body?.email || null
      };
      
      next();
    } catch (error) {
      console.error('Error in activity logger middleware:', error);
      next(); // Continue even if logging fails
    }
  };
};

/**
 * Log successful activity
 */
const logSuccess = async (req, additionalData = {}) => {
  try {
    if (req.activityData) {
      await UserActivity.log({
        ...req.activityData,
        ...additionalData,
        success: true
      });
    }
  } catch (error) {
    console.error('Error logging successful activity:', error);
  }
};

/**
 * Log failed activity
 */
const logFailure = async (req, errorMessage, additionalData = {}) => {
  try {
    if (req.activityData) {
      await UserActivity.log({
        ...req.activityData,
        ...additionalData,
        success: false,
        errorMessage,
        action: req.activityData.action === 'login' ? 'failed_login' : req.activityData.action
      });
    }
  } catch (error) {
    console.error('Error logging failed activity:', error);
  }
};

/**
 * Express middleware to log request details
 */
const requestLogger = (req, res, next) => {
  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);
  
  // Log basic request info
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${ipAddress}`);
  
  // Store in request for other middleware
  req.clientIP = ipAddress;
  req.clientUserAgent = userAgent;
  
  next();
};

module.exports = {
  logActivity,
  logSuccess,
  logFailure,
  requestLogger,
  getClientIP,
  getUserAgent,
  getRealPublicIP,
  parseDeviceInfo
};