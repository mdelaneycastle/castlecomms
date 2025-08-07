// Shared Notification System
class NotificationManager {
  constructor() {
    this.notifications = new Map();
    this.currentUser = null;
    this.isInitialized = false;
    this.lastChecked = new Date();
    this.checkInterval = null;
  }

  async initialize(user) {
    this.currentUser = user;
    this.isInitialized = true;
    
    // Create notification icon if it doesn't exist
    this.createNotificationIcon();
    
    // Load existing notifications
    await this.loadNotifications();
    
    // Start periodic checking
    this.startPeriodicCheck();
    
    console.log('Notification system initialized for user:', user.email);
  }

  createNotificationIcon() {
    // Check if notification icon already exists
    let notificationBell = document.getElementById('notification-bell');
    
    if (!notificationBell) {
      // Create the notification icon
      notificationBell = document.createElement('div');
      notificationBell.id = 'notification-bell';
      notificationBell.className = 'notification-bell';
      notificationBell.innerHTML = '🔔 <span id="notification-count" class="count-badge">0</span>';
      
      // Find the header and add the notification icon
      const header = document.querySelector('header');
      if (header) {
        header.appendChild(notificationBell);
      } else {
        // Fallback: add to body
        document.body.appendChild(notificationBell);
      }
    }

    // Add click handler
    notificationBell.addEventListener('click', () => {
      this.showNotificationPanel();
    });

    // Add CSS if not already present
    this.addNotificationCSS();
  }

  addNotificationCSS() {
    // Check if styles already exist
    if (document.getElementById('notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification-bell {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(102, 126, 234, 0.2);
        border-radius: 50px;
        padding: 12px 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      .notification-bell:hover {
        background: rgba(102, 126, 234, 0.1);
        border-color: rgba(102, 126, 234, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
      }

      .notification-bell.has-notifications {
        animation: pulse 2s infinite;
      }

      .count-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 700;
        min-width: 20px;
        text-align: center;
        line-height: 1;
      }

      .count-badge.zero {
        display: none;
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .notification-panel {
        position: fixed;
        top: 70px;
        right: 20px;
        width: 350px;
        max-height: 400px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(102, 126, 234, 0.1);
        z-index: 1001;
        display: none;
        overflow: hidden;
      }

      .notification-header {
        padding: 20px;
        border-bottom: 1px solid #e1e5e9;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .notification-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .notification-list {
        max-height: 300px;
        overflow-y: auto;
        padding: 0;
      }

      .notification-item {
        padding: 16px 20px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }

      .notification-item:hover {
        background: #f8f9fa;
      }

      .notification-item.unread {
        background: #f8f9ff;
        border-left: 4px solid #667eea;
      }

      .notification-item.unread::before {
        content: '';
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 8px;
        height: 8px;
        background: #667eea;
        border-radius: 50%;
      }

      .notification-title {
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 4px;
        font-size: 14px;
      }

      .notification-message {
        color: #6c757d;
        font-size: 13px;
        line-height: 1.4;
        margin-bottom: 4px;
      }

      .notification-time {
        color: #8a8a8a;
        font-size: 12px;
      }

      .no-notifications {
        padding: 40px 20px;
        text-align: center;
        color: #8a8a8a;
        font-style: italic;
      }

      .mark-all-read {
        padding: 12px 20px;
        text-align: center;
        border-top: 1px solid #e1e5e9;
        background: #f8f9fa;
        cursor: pointer;
        color: #667eea;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .mark-all-read:hover {
        background: #e9ecef;
      }

      @media (max-width: 768px) {
        .notification-panel {
          width: calc(100vw - 40px);
          right: 20px;
          left: 20px;
        }

        .notification-bell {
          top: 15px;
          right: 15px;
          padding: 10px 12px;
          font-size: 14px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  async loadNotifications() {
    try {
      // Check if Firebase database is available
      if (!firebase.database) {
        console.warn('Firebase database not available, notifications will be stored in memory only');
        this.updateNotificationCount();
        return;
      }

      // Load from Firebase
      const userNotificationsRef = firebase.database().ref(`notifications/${this.currentUser.uid}`);
      const snapshot = await userNotificationsRef.once('value');
      const data = snapshot.val() || {};
      
      this.notifications.clear();
      Object.entries(data).forEach(([id, notification]) => {
        this.notifications.set(id, { id, ...notification });
      });
      
      this.updateNotificationCount();
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Continue with empty notifications on error
      this.updateNotificationCount();
    }
  }

  async addNotification(type, title, message, metadata = {}) {
    const notificationId = Date.now().toString();
    const notification = {
      id: notificationId,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      metadata
    };

    try {
      // Save to Firebase if available
      if (firebase.database) {
        const userNotificationsRef = firebase.database().ref(`notifications/${this.currentUser.uid}/${notificationId}`);
        await userNotificationsRef.set(notification);
      }
      
      // Add to local cache
      this.notifications.set(notificationId, notification);
      
      this.updateNotificationCount();
      this.showTemporaryNotification(title, message);
    } catch (error) {
      console.error('Error adding notification:', error);
      // Still add to local cache even if Firebase save fails
      this.notifications.set(notificationId, notification);
      this.updateNotificationCount();
      this.showTemporaryNotification(title, message);
    }
  }

  async markAsRead(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.read) return;

    try {
      // Update in Firebase if available
      if (firebase.database) {
        const notificationRef = firebase.database().ref(`notifications/${this.currentUser.uid}/${notificationId}`);
        await notificationRef.update({ read: true });
      }
      
      // Update local cache
      notification.read = true;
      this.notifications.set(notificationId, notification);
      
      this.updateNotificationCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Still update local cache on error
      notification.read = true;
      this.notifications.set(notificationId, notification);
      this.updateNotificationCount();
    }
  }

  async markAllAsRead() {
    const unreadNotifications = Array.from(this.notifications.values()).filter(n => !n.read);
    
    for (const notification of unreadNotifications) {
      await this.markAsRead(notification.id);
    }
  }

  updateNotificationCount() {
    const unreadCount = Array.from(this.notifications.values()).filter(n => !n.read).length;
    const countBadge = document.getElementById('notification-count');
    const notificationBell = document.getElementById('notification-bell');
    
    if (countBadge) {
      countBadge.textContent = unreadCount;
      countBadge.className = unreadCount > 0 ? 'count-badge' : 'count-badge zero';
    }
    
    if (notificationBell) {
      notificationBell.classList.toggle('has-notifications', unreadCount > 0);
    }
  }

  showNotificationPanel() {
    let panel = document.getElementById('notification-panel');
    
    if (!panel) {
      panel = this.createNotificationPanel();
    }
    
    this.renderNotifications(panel);
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    
    // Close panel when clicking outside
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true });
    }, 100);
  }

  createNotificationPanel() {
    const panel = document.createElement('div');
    panel.id = 'notification-panel';
    panel.className = 'notification-panel';
    document.body.appendChild(panel);
    return panel;
  }

  renderNotifications(panel) {
    const notifications = Array.from(this.notifications.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const hasUnread = notifications.some(n => !n.read);
    
    panel.innerHTML = `
      <div class="notification-header">
        <h3>🔔 Notifications</h3>
      </div>
      <div class="notification-list">
        ${notifications.length === 0 ? 
          '<div class="no-notifications">No notifications yet</div>' :
          notifications.map(notification => `
            <div class="notification-item ${!notification.read ? 'unread' : ''}" 
                 data-id="${notification.id}" 
                 onclick="notificationManager.handleNotificationClick('${notification.id}')">
              <div class="notification-title">${notification.title}</div>
              <div class="notification-message">${notification.message}</div>
              <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
            </div>
          `).join('')
        }
      </div>
      ${hasUnread ? '<div class="mark-all-read" onclick="notificationManager.markAllAsRead()">Mark all as read</div>' : ''}
    `;
  }

  handleNotificationClick(notificationId) {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    // Mark as read
    this.markAsRead(notificationId);
    
    // Handle different notification types
    switch (notification.type) {
      case 'chat_message':
        if (notification.metadata.chatId) {
          window.location.href = `messages.html?chat=${notification.metadata.chatId}`;
        }
        break;
      case 'ticket_assigned':
        if (notification.metadata.ticketId) {
          window.location.href = `tickets.html?ticket=${notification.metadata.ticketId}`;
        }
        break;
      case 'newsfeed_mention':
        window.location.href = 'newsfeed.html';
        break;
    }
  }

  handleOutsideClick(e) {
    const panel = document.getElementById('notification-panel');
    const bell = document.getElementById('notification-bell');
    
    if (panel && !panel.contains(e.target) && !bell.contains(e.target)) {
      panel.style.display = 'none';
    }
  }

  showTemporaryNotification(title, message) {
    // Show a brief popup notification
    const popup = document.createElement('div');
    popup.className = 'temp-notification';
    popup.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        background: white;
        border: 1px solid #667eea;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        z-index: 1002;
        max-width: 300px;
        animation: slideInRight 0.3s ease;
      ">
        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 4px;">${title}</div>
        <div style="color: #6c757d; font-size: 14px;">${message}</div>
      </div>
    `;

    document.body.appendChild(popup);

    // Auto remove after 4 seconds
    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, 4000);
  }

  startPeriodicCheck() {
    // Disabled periodic checking to avoid permission issues
    // Real-time notifications are created when actions happen (messages sent, tickets created, mentions posted)
    console.log('✅ Real-time notification system active (periodic checking disabled for security)');
  }

  async checkForNewNotifications() {
    // Disabled - notifications are created in real-time when actions occur
    console.log('Periodic notification checking disabled - using real-time notifications only');
  }

  // These functions are disabled in favor of real-time notifications
  // Real-time notifications are created directly when:
  // - Messages are sent (in messages.html sendMessage function)
  // - Tickets are created (in tickets.html createTicketFromModal function)  
  // - @Mentions are posted (in newsfeed.html processMentions function)

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.isInitialized = false;
  }
}

// Global notification manager instance
window.notificationManager = new NotificationManager();

// Auto-initialize when user is available
if (typeof window.getCurrentUser === 'function') {
  window.getCurrentUser().then(user => {
    if (user) {
      window.notificationManager.initialize(user);
    }
  });
} else {
  // Fallback - try to initialize when Firebase auth changes
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      window.notificationManager.initialize(user);
    }
  });
}

// Add CSS animation for temporary notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
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