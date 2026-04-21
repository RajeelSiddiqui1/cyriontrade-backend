const { admin } = require('../config/firebase');

/**
 * Verify Firebase ID token
 * Tokens expire after 1 hour by default
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authentication required. Please login.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Invalid authentication format',
        code: 'INVALID_FORMAT'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken || idToken.trim() === '') {
      return res.status(401).json({ 
        error: 'Authentication token is missing',
        code: 'TOKEN_MISSING'
      });
    }
    
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check if token is expired (Firebase tokens expire after 1 hour)
    const now = Math.floor(Date.now() / 1000);
    if (decodedToken.exp < now) {
      return res.status(401).json({ 
        error: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED'
      });
    }
    
    // Store user info for use in routes
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };
    
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    
    let errorMessage = 'Invalid authentication. Please login again.';
    let errorCode = 'AUTH_INVALID';
    
    // Handle specific Firebase errors
    if (error.code === 'auth/id-token-expired') {
      errorMessage = 'Session expired. Please login again.';
      errorCode = 'SESSION_EXPIRED';
    } else if (error.code === 'auth/id-token-revoked') {
      errorMessage = 'Session has been revoked. Please login again.';
      errorCode = 'SESSION_REVOKED';
    } else if (error.code === 'auth/argument-error') {
      errorMessage = 'Invalid token format. Please login again.';
      errorCode = 'INVALID_TOKEN';
    }
    
    return res.status(401).json({ 
      error: errorMessage,
      code: errorCode
    });
  }
};

module.exports = { verifyToken };
