// Security: Force HTTPS redirect
if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  location.replace('https:' + window.location.href.substring(window.location.protocol.length));
}

// Firebase Configuration - Castle Comms Internal Website
// Note: These config values are safe to expose client-side as they're designed for public use
const firebaseConfig = {
  apiKey: "AIzaSyDJvHNZB_pzhytD7yLa69auStrZBk2SEHk",
  authDomain: "castle-comms.firebaseapp.com",
  databaseURL: "https://castle-comms-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "castle-comms",
  storageBucket: "castle-comms.firebasestorage.app",
  messagingSenderId: "959264765744",
  appId: "1:959264765744:web:7aee345a37673f720cfaf5",
  measurementId: "G-NLS757VMJ8"
};

// Initialize Firebase App
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase initialized successfully");
  }
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  throw new Error("Failed to initialize Firebase: " + error.message);
}

// Initialize Firebase services
window.firebaseServices = {
  auth: null,
  db: null,
  storage: null
};

// Auth initialization
try {
  window.firebaseServices.auth = firebase.auth();
  console.log("🔐 Firebase Auth initialized");
} catch (error) {
  console.error("❌ Firebase Auth initialization failed:", error);
}

// Realtime Database initialization
try {
  if (typeof firebase.database === "function") {
    window.firebaseServices.db = firebase.database();
    window.db = window.firebaseServices.db; // Maintain backward compatibility
    console.log("📊 Firebase Realtime Database initialized");
  } else {
    console.warn("⚠️ Firebase Database SDK not loaded");
  }
} catch (error) {
  console.error("❌ Firebase Database initialization failed:", error);
}

// Storage initialization
try {
  if (typeof firebase.storage === "function") {
    window.firebaseServices.storage = firebase.storage();
    window.storage = window.firebaseServices.storage; // Maintain backward compatibility
    console.log("💾 Firebase Storage initialized");
  } else {
    console.warn("⚠️ Firebase Storage SDK not loaded");
  }
} catch (error) {
  console.error("❌ Firebase Storage initialization failed:", error);
}

// Utility function to check if Firebase is ready
window.isFirebaseReady = function() {
  return !!(window.firebaseServices.auth && firebase.apps.length > 0);
};

// Global error handler for Firebase operations
window.handleFirebaseError = function(error, operation = "Firebase operation") {
  console.error(`❌ ${operation} failed:`, error);
  
  const errorMessages = {
    'auth/user-not-found': 'No user account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'permission-denied': 'You do not have permission to perform this action.',
    'network-request-failed': 'Network error. Please check your connection.'
  };
  
  return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
};

// Authorization utilities
window.authUtils = {
  // Check if current user has admin privileges
  async isAdmin(user = null) {
    try {
      const currentUser = user || firebase.auth().currentUser;
      if (!currentUser) return false;
      
      const tokenResult = await currentUser.getIdTokenResult();
      return !!(tokenResult.claims.admin);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },

  // Check if current user has communications admin privileges
  async isCommunicationsAdmin(user = null) {
    try {
      const currentUser = user || firebase.auth().currentUser;
      if (!currentUser) return false;
      
      const tokenResult = await currentUser.getIdTokenResult();
      console.log('🔍 Communications admin check - Claims:', tokenResult.claims);
      const hasCommAdmin = !!(tokenResult.claims.communicationsAdmin || tokenResult.claims.admin);
      console.log('🔍 isCommunicationsAdmin result:', hasCommAdmin);
      return hasCommAdmin;
    } catch (error) {
      console.error('Error checking communications admin status:', error);
      return false;
    }
  },

  // Get user's custom claims
  async getUserClaims(user = null) {
    try {
      const currentUser = user || firebase.auth().currentUser;
      if (!currentUser) return {};
      
      const tokenResult = await currentUser.getIdTokenResult();
      return tokenResult.claims || {};
    } catch (error) {
      console.error('Error getting user claims:', error);
      return {};
    }
  },

  // Check if user has specific permission
  async hasPermission(permission, user = null) {
    try {
      const claims = await this.getUserClaims(user);
      return !!(claims[permission] || claims.admin);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  },

  // Show/hide admin and communications admin elements based on user permissions
  async toggleAdminElements(user = null) {
    const isAdmin = await this.isAdmin(user);
    const isCommunicationsAdmin = await this.isCommunicationsAdmin(user);
    
    console.log('🔍 toggleAdminElements - isAdmin:', isAdmin, 'isCommunicationsAdmin:', isCommunicationsAdmin);
    
    // Admin-only elements (visible only to admins)
    const adminElements = document.querySelectorAll('[data-admin-only]');
    console.log('🔍 Found admin-only elements:', adminElements.length);
    adminElements.forEach(element => {
      element.style.display = isAdmin ? '' : 'none';
    });
    
    // Communications admin elements (visible to communications admins and full admins)
    const communicationsAdminElements = document.querySelectorAll('[data-communications-admin]');
    console.log('🔍 Found communications-admin elements:', communicationsAdminElements.length);
    communicationsAdminElements.forEach(element => {
      element.style.display = isCommunicationsAdmin ? '' : 'none';
    });
    
    return { isAdmin, isCommunicationsAdmin };
  }
};
