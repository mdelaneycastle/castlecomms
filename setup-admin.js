// Admin User Setup Script for Castle Comms
// This script sets up admin privileges using Firebase Admin SDK

const admin = require('firebase-admin');

// You'll need to download your service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key
// Save the file as 'serviceAccountKey.json' in this directory

try {
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://castle-comms-default-rtdb.europe-west1.firebasedatabase.app'
  });

  console.log('🔥 Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:');
  console.error('Make sure you have downloaded serviceAccountKey.json from Firebase Console');
  console.error('Go to: Project Settings > Service Accounts > Generate New Private Key');
  process.exit(1);
}

// Function to make a user admin
async function makeUserAdmin(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`👤 Found user: ${user.email} (UID: ${user.uid})`);

    // Set admin custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Admin privileges granted to ${email}`);
    console.log('🔄 User must sign out and back in for changes to take effect');
    
    return user;
  } catch (error) {
    console.error(`❌ Error setting admin privileges for ${email}:`, error.message);
    throw error;
  }
}

// Function to remove admin privileges
async function removeAdminPrivileges(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: false });
    console.log(`✅ Admin privileges removed from ${email}`);
    return user;
  } catch (error) {
    console.error(`❌ Error removing admin privileges for ${email}:`, error.message);
    throw error;
  }
}

// Function to check user's current claims
async function checkUserClaims(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    const claims = user.customClaims || {};
    console.log(`👤 User: ${email}`);
    console.log(`🔑 Claims:`, claims);
    console.log(`👑 Is Admin: ${!!claims.admin}`);
    return claims;
  } catch (error) {
    console.error(`❌ Error checking claims for ${email}:`, error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔧 Castle Comms Admin Setup Tool

Usage:
  node setup-admin.js make-admin <email>     - Grant admin privileges
  node setup-admin.js remove-admin <email>   - Remove admin privileges  
  node setup-admin.js check <email>          - Check user's current claims

Examples:
  node setup-admin.js make-admin test@castlefineart.com
  node setup-admin.js check test@castlefineart.com
    `);
    process.exit(0);
  }

  const command = args[0];
  const email = args[1];

  if (!email) {
    console.error('❌ Please provide an email address');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'make-admin':
        await makeUserAdmin(email);
        break;
      case 'remove-admin':
        await removeAdminPrivileges(email);
        break;
      case 'check':
        await checkUserClaims(email);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.error('Valid commands: make-admin, remove-admin, check');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Operation completed successfully');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { makeUserAdmin, removeAdminPrivileges, checkUserClaims };