const { db } = require('../config/firebase');
const { 
  collection, 
  getDocs, 
  query, 
  limit,
  orderBy
} = require('firebase/firestore');

/**
 * Check what collections exist in Firestore
 */
async function checkFirestoreCollections() {
  try {
    console.log('🔍 Checking Firestore Database...\n');

    // Check userActivities collection
    console.log('📊 User Activities Collection:');
    try {
      const activitiesRef = collection(db, 'userActivities');
      const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'), limit(5));
      const activitiesSnapshot = await getDocs(activitiesQuery);
      
      if (activitiesSnapshot.empty) {
        console.log('   ❌ No user activities found');
      } else {
        console.log(`   ✅ Found ${activitiesSnapshot.size} recent activities:`);
        activitiesSnapshot.forEach((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate?.()?.toISOString() || data.timestamp;
          console.log(`   - ${data.action} by ${data.email || 'Unknown'} from ${data.ipAddress} at ${timestamp}`);
        });
      }
    } catch (error) {
      console.log('   ❌ Error accessing userActivities:', error.message);
    }

    console.log('\n📝 Watchlists Collection:');
    try {
      const watchlistsRef = collection(db, 'watchlists');
      const watchlistsSnapshot = await getDocs(query(watchlistsRef, limit(5)));
      
      if (watchlistsSnapshot.empty) {
        console.log('   ❌ No watchlists found');
      } else {
        console.log(`   ✅ Found ${watchlistsSnapshot.size} watchlists`);
        watchlistsSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`   - User: ${doc.id}, Coins: ${data.coins?.length || 0}`);
        });
      }
    } catch (error) {
      console.log('   ❌ Error accessing watchlists:', error.message);
    }

    console.log('\n👥 Users Collection:');
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(query(usersRef, limit(5)));
      
      if (usersSnapshot.empty) {
        console.log('   ❌ No users found in Firestore');
      } else {
        console.log(`   ✅ Found ${usersSnapshot.size} users in Firestore`);
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`   - User: ${data.email || doc.id}, Created: ${data.createdAt?.toDate?.()?.toISOString() || 'Unknown'}`);
        });
      }
    } catch (error) {
      console.log('   ❌ Error accessing users:', error.message);
    }

  } catch (error) {
    console.error('❌ Error checking Firestore:', error);
  }
}

/**
 * Display Firebase project info
 */
function displayFirebaseInfo() {
  console.log('🔥 Firebase Project Information:');
  console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`   Auth Domain: ${process.env.FIREBASE_AUTH_DOMAIN}`);
  console.log(`   Storage Bucket: ${process.env.FIREBASE_STORAGE_BUCKET}`);
  console.log('');
}

/**
 * Main function to check all Firebase data
 */
async function checkAllFirebaseData() {
  console.log('🚀 Firebase Data Check Starting...\n');
  
  displayFirebaseInfo();
  await checkFirestoreCollections();
  
  console.log('\n📋 Summary:');
  console.log('   🔐 Authentication: Stores user accounts, emails, passwords');
  console.log('   🗄️  Firestore: Stores application data (activities, watchlists, etc.)');
  console.log('   📊 User Activities: Logged to Firestore "userActivities" collection');
  console.log('   👤 User Profiles: Can be stored in both Auth and Firestore');
  
  console.log('\n✅ Firebase Data Check Complete!');
}

// Run the check if this file is executed directly
if (require.main === module) {
  checkAllFirebaseData().catch(console.error);
}

module.exports = {
  checkFirestoreCollections,
  displayFirebaseInfo,
  checkAllFirebaseData
};