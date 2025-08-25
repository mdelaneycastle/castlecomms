// Notification Manager for Castle Comms
// Handles push notification permissions and FCM token management

class NotificationManager {
  constructor() {
    this.messaging = null;
    this.currentToken = null;
    this.vapidKey = 'BIm0sZOBUG2pJHgYwmTb0v_FADzXCujJpD-wQXQSS1j7TjVDz901GWWNVVKO2HfY2CVLXjiMfirCL-KJDLSOUu4';
    
    this.init();
  }

  async init() {
    try {
      // Wait for Firebase to be ready
      if (!window.isFirebaseReady || !window.isFirebaseReady()) {
        console.log('Waiting for Firebase to initialize...');
        await new Promise(resolve => {
          const checkFirebase = () => {
            if (window.isFirebaseReady && window.isFirebaseReady()) {
              resolve();
            } else {
              setTimeout(checkFirebase, 100);
            }
          };
          checkFirebase();
        });
      }

      // Initialize Firebase Messaging
      if (firebase.messaging && firebase.messaging.isSupported()) {
        this.messaging = firebase.messaging();
        console.log('🔔 Firebase Messaging initialized');
        
        // Set up the service worker
        await this.setupServiceWorker();
      } else {
        console.warn('⚠️ Firebase Messaging not supported on this browser');
      }
    } catch (error) {
      console.error('❌ Failed to initialize NotificationManager:', error);
    }
  }

  async setupServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service Worker registered:', registration);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker ready');
        
        // Make sure service worker is active
        if (registration.active) {
          console.log('✅ Service Worker is active');
        } else {
          console.log('⏳ Waiting for Service Worker to activate...');
          await new Promise(resolve => {
            if (registration.installing) {
              registration.installing.addEventListener('statechange', (e) => {
                if (e.target.state === 'activated') {
                  console.log('✅ Service Worker activated');
                  resolve();
                }
              });
            } else if (registration.waiting) {
              registration.waiting.addEventListener('statechange', (e) => {
                if (e.target.state === 'activated') {
                  console.log('✅ Service Worker activated');
                  resolve();
                }
              });
            } else {
              resolve();
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  async requestPermission() {
    try {
      console.log('🔔 Requesting notification permission...');
      
      if (!this.messaging) {
        throw new Error('Firebase Messaging not initialized');
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);

      if (permission === 'granted') {
        // Wait a bit for service worker to be fully ready
        console.log('⏳ Waiting for service worker to be ready before getting token...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // Get FCM token
          const token = await this.messaging.getToken({ vapidKey: this.vapidKey });
          if (token) {
            console.log('✅ FCM Token received:', token);
            this.currentToken = token;
            
            // Save token to Firebase for this user
            await this.saveTokenToDatabase(token);
            
            // Set up token refresh listener
            this.setupTokenRefresh();
            
            // Set up foreground message listener
            this.setupForegroundMessageListener();
            
            return { success: true, token };
          } else {
            console.warn('⚠️ No registration token available');
            return { success: false, error: 'No token available' };
          }
        } catch (tokenError) {
          console.error('❌ Error getting FCM token:', tokenError);
          if (tokenError.code === 'messaging/failed-service-worker-registration') {
            return { success: false, error: 'Service worker not ready. Please try again in a moment.' };
          }
          return { success: false, error: tokenError.message };
        }
      } else {
        console.warn('⚠️ Notification permission denied');
        return { success: false, error: 'Permission denied' };
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return { success: false, error: error.message };
    }
  }

  async saveTokenToDatabase(token) {
    try {
      const user = firebase.auth().currentUser;
      if (user && window.firebaseServices.db) {
        // Debug: Check what we're getting for user
        console.log('🔍 Firebase user object:', user);
        console.log('🔍 User email from Firebase:', user.email);
        console.log('🔍 User UID:', user.uid);
        
        // Clean the email if it contains mailto:
        let cleanEmail = user.email;
        if (cleanEmail && cleanEmail.startsWith('mailto:')) {
          cleanEmail = cleanEmail.replace('mailto:', '');
          console.log('🧹 Cleaned email from mailto:', cleanEmail);
        }
        
        // Use a shorter key for the token path to avoid issues
        const tokenKey = token.substring(0, 20);
        await window.firebaseServices.db.ref(`users/${user.uid}/fcmTokens/${tokenKey}`).set({
          token,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          email: cleanEmail,
          originalEmail: user.email
        });
        console.log('✅ FCM token saved to database for user:', cleanEmail);
        console.log('🔑 Token key:', tokenKey, 'Full token length:', token.length);
      } else {
        console.error('❌ Cannot save token: user or database not available');
        console.log('❌ Debug - User:', user);
        console.log('❌ Debug - Database:', window.firebaseServices.db);
      }
    } catch (error) {
      console.error('❌ Error saving FCM token:', error);
    }
  }

  setupTokenRefresh() {
    if (!this.messaging) return;
    
    this.messaging.onTokenRefresh(() => {
      console.log('🔄 FCM token refreshed');
      this.messaging.getToken({ vapidKey: this.vapidKey }).then((refreshedToken) => {
        console.log('✅ New FCM token:', refreshedToken);
        this.currentToken = refreshedToken;
        this.saveTokenToDatabase(refreshedToken);
      }).catch((err) => {
        console.error('❌ Unable to retrieve refreshed token:', err);
      });
    });
  }

  setupForegroundMessageListener() {
    if (!this.messaging) return;
    
    this.messaging.onMessage((payload) => {
      console.log('📨 Message received in foreground:', payload);
      
      // Show a custom notification when the app is in foreground
      this.showForegroundNotification(payload);
      
      // Update page title with notification
      if (payload.data && payload.data.senderName) {
        document.title = `💬 ${payload.data.senderName} - Castle Comms`;
        
        // Reset title after 5 seconds
        setTimeout(() => {
          document.title = 'Chat - Castle Comms';
        }, 5000);
      }
      
      // Play notification sound (if user hasn't disabled it)
      if ('Audio' in window) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGIeBDqE0fPTfiMFl2+z9seGQQgZZ7zx7Z9rFAw6kdXz0HwqBS12z+/eizcHi2mq88KBPgcYZ7zx4ZVpEwk5kdXzzoEtBSR3z+/igDEHi2uq9MaERQgXZrfyy3soBSt4ze7ciC4GhGe38sh4Kgh4');
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Ignore audio play errors (browser restrictions)
          });
        } catch (e) {
          // Ignore audio errors
        }
      }
    });
  }

  showForegroundNotification(payload) {
    const title = payload.notification?.title || 'New Message';
    const body = payload.notification?.body || 'You have a new message';
    
    // Create a custom notification UI element
    const notification = document.createElement('div');
    notification.className = 'foreground-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">💬</div>
        <div class="notification-text">
          <div class="notification-title">${title}</div>
          <div class="notification-body">${body}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    // Add CSS if not already added
    if (!document.querySelector('#foreground-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'foreground-notification-styles';
      style.textContent = `
        .foreground-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          min-width: 300px;
          animation: slideIn 0.3s ease-out;
        }
        
        .notification-content {
          display: flex;
          align-items: flex-start;
          padding: 16px;
          gap: 12px;
        }
        
        .notification-icon {
          font-size: 24px;
          flex-shrink: 0;
        }
        
        .notification-text {
          flex: 1;
        }
        
        .notification-title {
          font-weight: 600;
          color: #323130;
          margin-bottom: 4px;
        }
        
        .notification-body {
          color: #605e5c;
          font-size: 14px;
        }
        
        .notification-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #605e5c;
          padding: 0;
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  async getPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  async getCurrentToken() {
    return this.currentToken;
  }

  // Debug function to check token storage
  async checkTokenStorage() {
    try {
      const user = firebase.auth().currentUser;
      if (user && window.firebaseServices.db) {
        const tokensSnapshot = await window.firebaseServices.db.ref(`users/${user.uid}/fcmTokens`).once('value');
        const tokens = tokensSnapshot.val();
        console.log('🔍 Current stored tokens for', user.email, ':', tokens);
        return tokens;
      }
    } catch (error) {
      console.error('❌ Error checking token storage:', error);
    }
  }

  // Method to show notification setup UI
  showNotificationSetup() {
    const setupModal = document.createElement('div');
    setupModal.id = 'notification-setup-modal';
    setupModal.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-content">
          <h3>Enable Push Notifications</h3>
          <p>Get notified instantly when you receive new messages, even when the app is closed.</p>
          <div class="modal-actions">
            <button class="btn-primary" id="enable-notifications">Enable Notifications</button>
            <button class="btn-secondary" id="skip-notifications">Maybe Later</button>
          </div>
        </div>
      </div>
    `;
    
    // Add modal styles
    if (!document.querySelector('#notification-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-modal-styles';
      style.textContent = `
        #notification-setup-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10001;
        }
        
        .modal-backdrop {
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          margin: 20px;
          text-align: center;
        }
        
        .modal-content h3 {
          margin: 0 0 16px 0;
          color: #323130;
          font-size: 20px;
        }
        
        .modal-content p {
          color: #605e5c;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .btn-primary, .btn-secondary {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        
        .btn-primary {
          background: #6264a7;
          color: white;
        }
        
        .btn-primary:hover {
          background: #585a96;
        }
        
        .btn-secondary {
          background: #f3f2f1;
          color: #323130;
        }
        
        .btn-secondary:hover {
          background: #e1dfdd;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(setupModal);
    
    // Event listeners
    document.getElementById('enable-notifications').onclick = async () => {
      const result = await this.requestPermission();
      setupModal.remove();
      
      if (result.success) {
        this.showNotificationSuccess();
      } else {
        this.showNotificationError(result.error);
      }
    };
    
    document.getElementById('skip-notifications').onclick = () => {
      setupModal.remove();
    };
    
    // Close on backdrop click
    setupModal.querySelector('.modal-backdrop').onclick = (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        setupModal.remove();
      }
    };
  }

  showNotificationSuccess() {
    const successMsg = document.createElement('div');
    successMsg.className = 'notification-success';
    successMsg.innerHTML = `
      <div class="success-content">
        <div class="success-icon">✅</div>
        <div>Notifications enabled! You'll now receive push notifications for new messages.</div>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      .notification-success {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dff6dd;
        border: 1px solid #d4ead0;
        color: #0f5132;
        padding: 16px;
        border-radius: 8px;
        z-index: 10002;
        max-width: 350px;
      }
      
      .success-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .success-icon {
        font-size: 20px;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(successMsg);
    
    setTimeout(() => successMsg.remove(), 4000);
  }

  showNotificationError(error) {
    console.error('Notification setup error:', error);
    // You could show an error message here
  }
}

// Initialize notification manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.notificationManager = new NotificationManager();
});

// Expose NotificationManager globally
window.NotificationManager = NotificationManager;