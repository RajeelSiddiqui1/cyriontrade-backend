const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
const admin = require('firebase-admin');

// Client SDK for auth operations
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Admin SDK for token verification
try {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  if (error.code !== 'app/duplicate-app') {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

console.log('✅ Firebase initialized successfully');
console.log(`📦 Project ID: ${process.env.FIREBASE_PROJECT_ID}`);

module.exports = { auth, db, admin };
