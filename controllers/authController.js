const { auth } = require('../config/firebase');
const {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} = require('firebase/auth');
const { logSuccess, logFailure } = require('../middleware/activityLogger');

/**
 * POST /api/auth/login
 * Login with email and password
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get ID token
    const idToken = await user.getIdToken();

    // Log successful login
    await logSuccess(req, {
      userId: user.uid,
      email: user.email
    });

    // Fetch additional data from Firestore
    const { db } = require('../config/firebase');
    const { doc, getDoc } = require('firebase/firestore');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName || user.displayName,
        photoURL: userData.photoURL || user.photoURL,
        walletAddress: userData.walletAddress,
        walletConnected: userData.walletConnected,
        registrationCompleted: userData.registrationCompleted
      },
      token: idToken
    });
  } catch (error) {
    console.error('Login error:', error);

    let errorMessage = 'Login failed';
    let statusCode = 401;

    switch (error.code) {
      case 'auth/invalid-login-credentials':
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        statusCode = 400;
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        statusCode = 403;
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later';
        statusCode = 429;
        break;
      default:
        errorMessage = error.message || 'Login failed';
    }

    // Log failed login
    await logFailure(req, errorMessage);

    res.status(statusCode).json({ error: errorMessage });
  }
};

/**
 * POST /api/auth/signup
 * Create new user account (step 1 - email/password only)
 */
exports.signup = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile if displayName provided
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Create user document in Firestore
    const { db } = require('../config/firebase');
    const { doc, setDoc, Timestamp } = require('firebase/firestore');

    await setDoc(doc(db, 'users', user.uid), {
      userId: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || email.split('@')[0],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      walletConnected: false,
      registrationCompleted: false
    });

    // Log partial signup
    await logSuccess(req, {
      userId: user.uid,
      email: user.email,
      action: 'signup'
    });

    // Get ID token for auto-login
    const idToken = await user.getIdToken();

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName,
      },
      token: idToken
    });
  } catch (error) {
    console.error('Signup error:', error);

    let errorMessage = 'Signup failed';
    let statusCode = 400;

    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Email already in use';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak';
        break;
      default:
        errorMessage = error.message || 'Signup failed';
        statusCode = 500;
    }

    // Log failed signup
    await logFailure(req, errorMessage, { action: 'signup' });

    res.status(statusCode).json({ error: errorMessage });
  }
};

/**
 * POST /api/auth/logout
 * Logout user
 */
exports.logout = async (req, res) => {
  try {
    await signOut(auth);

    // Log successful logout
    await logSuccess(req, {
      action: 'logout'
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);

    // Log failed logout
    await logFailure(req, 'Logout failed');

    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * POST /api/auth/reset-password
 * Send password reset email
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await sendPasswordResetEmail(auth, email);

    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Reset password error:', error);

    let errorMessage = 'Failed to send reset email';

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }

    res.status(400).json({ error: errorMessage });
  }
};

/**
 * GET /api/auth/config
 * Get Firebase client configuration
 */
exports.getConfig = (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  });
};

/**
 * GET /api/auth/verify
 * Verify user token
 */
// verifyToken
exports.verifyToken = async (req, res) => {
  try {
    const user = req.user; // Set by auth middleware
    
    // Fetch additional data from Firestore
    const { db } = require('../config/firebase');
    const { doc, getDoc } = require('firebase/firestore');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName || user.displayName,
        photoURL: userData.photoURL || user.photoURL,
        walletAddress: userData.walletAddress,
        walletConnected: userData.walletConnected,
        registrationCompleted: userData.registrationCompleted
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * POST /api/auth/complete-signup
 * Complete registration with wallet connection
 */
exports.completeSignup = async (req, res) => {
  try {
    const { userId, walletAddress, signature } = req.body;

    if (!userId || !walletAddress) {
      return res.status(400).json({ error: 'User ID and wallet address are required' });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Store wallet address in Firestore
    const { db } = require('../config/firebase');
    const { doc, setDoc, getDoc } = require('firebase/firestore');

    const userDocRef = doc(db, 'users', userId);

    // Check if user already exists
    const userDoc = await getDoc(userDocRef);

    const userData = {
      userId,
      walletAddress: walletAddress.toLowerCase(), // Store in lowercase for consistency
      walletConnected: true,
      registrationCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (userDoc.exists()) {
      // Update existing user
      const existingData = userDoc.data();
      await setDoc(userDocRef, {
        ...existingData,
        ...userData
      }, { merge: true });
    } else {
      // Create new user document
      await setDoc(userDocRef, userData);
    }

    // Log successful wallet connection
    await logSuccess(req, {
      userId,
      action: 'wallet_connected',
      walletAddress: walletAddress.toLowerCase()
    });

    res.json({
      success: true,
      message: 'Registration completed successfully! You can now log in.',
      walletAddress: walletAddress.toLowerCase()
    });
  } catch (error) {
    console.error('Complete signup error:', error);

    // Log failed wallet connection
    await logFailure(req, error.message, { action: 'wallet_connection_failed' });

    res.status(500).json({ error: 'Failed to complete registration' });
  }
};

/**
 * POST /api/auth/google
 * Handle Google Sign-In (exchange Firebase token for session)
 */
exports.googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    // The token is already verified by Firebase on client
    // We just need to return success and the token
    res.json({
      success: true,
      token: idToken,
      message: 'Google sign-in successful'
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: 'Google sign-in failed' });
  }
};

/**
 * POST /api/auth/purchase
 * Log a purchase event
 */
exports.purchase = async (req, res) => {
  try {
    const { userId, itemId, price, category } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({ error: 'User ID and Item ID are required' });
    }

    const { db } = require('../config/firebase');
    const { collection, addDoc, Timestamp } = require('firebase/firestore');

    const purchaseData = {
      userId,
      itemId,
      price,
      category,
      timestamp: Timestamp.now(),
      status: 'completed'
    };

    await addDoc(collection(db, 'purchases'), purchaseData);

    // Log successful purchase
    await logSuccess(req, {
      userId,
      action: 'purchase',
      itemId,
      price
    });

    res.json({
      success: true,
      message: 'Purchase successful! Your item is now available.',
      purchaseId: userId + '_' + Date.now()
    });
  } catch (error) {
    console.error('Purchase error:', error);
    await logFailure(req, error.message, { action: 'purchase_failed' });
    res.status(500).json({ error: 'Failed to complete purchase' });
  }
};
