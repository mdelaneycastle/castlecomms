// Notification Badge System for Castle Comms
// Shows notification counts next to relevant sidebar menu items

class NotificationBadgeManager {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this.listeners = [];
    this.badgeData = {
      messages: 0,
      tickets: 0,
      newsfeed: 0,
      recognition: 0,
      gallery: 0
    };
    this.lastSeen = {
      messages: new Date(),
      tickets: new Date(),
      newsfeed: new Date(), 
      recognition: new Date(),
      gallery: new Date()
    };
  }

  async initialize(user) {
    if (!user) {
      console.warn('⚠️ No user provided to NotificationBadgeManager');
      return;
    }

    this.currentUser = user;
    console.log('🔔 Initializing notification badge system for:', user.email);

    try {
      // Load user's last seen timestamps
      await this.loadLastSeenTimestamps();
      
      // Calculate initial badge counts
      await this.updateAllBadgeCounts();
      
      // Set up real-time listeners
      this.setupRealTimeListeners();
      
      this.isInitialized = true;
      console.log('✅ Notification badge system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification badge system:', error);
    }
  }

  async loadLastSeenTimestamps() {
    try {
      if (!window.db) {
        console.warn('⚠️ Firebase database not available, using default timestamps');
        return;
      }

      const userRef = window.db.ref(`users/${this.currentUser.uid}/lastSeen`);
      const snapshot = await userRef.once('value');
      const data = snapshot.val();

      if (data) {
        // Convert string timestamps back to Date objects
        Object.keys(this.lastSeen).forEach(key => {
          if (data[key]) {
            this.lastSeen[key] = new Date(data[key]);
          }
        });
        console.log('📅 Loaded last seen timestamps:', this.lastSeen);
      } else {
        console.log('📅 No previous last seen data, using current time as baseline');
        // Save current timestamps as baseline
        await this.saveLastSeenTimestamps();
      }
    } catch (error) {
      console.error('❌ Error loading last seen timestamps:', error);
    }
  }

  async saveLastSeenTimestamps() {
    try {
      if (!window.db) return;

      const userRef = window.db.ref(`users/${this.currentUser.uid}/lastSeen`);
      const timestampData = {};
      
      // Convert Date objects to ISO strings for storage
      Object.keys(this.lastSeen).forEach(key => {
        timestampData[key] = this.lastSeen[key].toISOString();
      });

      await userRef.set(timestampData);
      console.log('💾 Saved last seen timestamps');
    } catch (error) {
      console.error('❌ Error saving last seen timestamps:', error);
    }
  }

  async updateLastSeen(pageType) {
    if (!this.isInitialized) {
      console.warn('⚠️ Notification system not initialized yet, queuing updateLastSeen for:', pageType);
      // Wait up to 5 seconds for initialization
      let attempts = 0;
      while (!this.isInitialized && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!this.isInitialized) {
        console.error('❌ Notification system failed to initialize, cannot update last seen for:', pageType);
        return;
      }
    }

    if (!this.lastSeen.hasOwnProperty(pageType)) {
      console.warn('⚠️ Unknown page type:', pageType);
      return;
    }

    this.lastSeen[pageType] = new Date();
    await this.saveLastSeenTimestamps();
    
    // Reset badge count for this page type
    this.badgeData[pageType] = 0;
    this.updateBadgeDisplay(pageType);
    
    console.log(`👁️ Updated last seen for ${pageType}`);
  }

  async updateAllBadgeCounts() {
    try {
      await Promise.all([
        this.updateMessagesBadge(),
        this.updateTicketsBadge(),
        this.updateNewsfeedBadge(),
        this.updateRecognitionBadge(),
        this.updateGalleryBadge()
      ]);
      
      console.log('🔄 Updated all badge counts:', this.badgeData);
    } catch (error) {
      console.error('❌ Error updating badge counts:', error);
    }
  }

  async updateMessagesBadge() {
    try {
      if (!window.firebase || !window.firebase.firestore) return;

      const db = firebase.firestore();
      let unreadCount = 0;

      // Permission-aware approach: First get chats user participates in, then count messages
      try {
        // Get all chats where user is a participant
        const chatsSnapshot = await db.collection('chats')
          .where('participants', 'array-contains', this.currentUser.email)
          .get();
        
        const chatIds = chatsSnapshot.docs.map(doc => doc.id);
        
        if (chatIds.length > 0) {
          // For each chat, count new messages since last seen
          for (const chatId of chatIds) {
            try {
              const messagesSnapshot = await db.collection('chat-messages')
                .where('chatId', '==', chatId)
                .where('timestamp', '>', this.lastSeen.messages)
                .get();
              
              // Count messages not from current user
              messagesSnapshot.docs.forEach(doc => {
                const messageData = doc.data();
                if (messageData.senderEmail !== this.currentUser.email) {
                  unreadCount++;
                }
              });
            } catch (chatError) {
              console.log(`📧 Could not access messages for chat ${chatId}:`, chatError.message);
            }
          }
        }
      } catch (permissionError) {
        console.log('📧 Messages access limited, using fallback count:', permissionError.message);
        // Fallback - assume no new messages if we can't query
        unreadCount = 0;
      }

      this.badgeData.messages = unreadCount;
      this.updateBadgeDisplay('messages');
    } catch (error) {
      console.error('❌ Error updating messages badge:', error);
      this.badgeData.messages = 0;
      this.updateBadgeDisplay('messages');
    }
  }

  async updateTicketsBadge() {
    try {
      if (!window.firebase || !window.firebase.firestore) return;

      const db = firebase.firestore();
      let unreadCount = 0;

      try {
        // Simplified approach - get all tickets since last seen and filter client-side
        const ticketsSnapshot = await db.collection('tickets')
          .where('createdAt', '>', this.lastSeen.tickets)
          .get();

        // Filter client-side for tickets assigned to current user
        ticketsSnapshot.docs.forEach(doc => {
          const ticketData = doc.data();
          // Check if assigned to current user (handle different assignment formats)
          const isAssignedToUser = 
            ticketData.assignedTo?.email === this.currentUser.email ||
            ticketData.assignedTo?.teamMembers?.some(member => member.email === this.currentUser.email) ||
            (ticketData.assignedTo === this.currentUser.email); // legacy format
          
          if (isAssignedToUser) {
            unreadCount++;
          }
        });
      } catch (permissionError) {
        console.log('🎫 Tickets access limited, using fallback count');
        // Fallback count
        unreadCount = 0;
      }
      
      this.badgeData.tickets = unreadCount;
      this.updateBadgeDisplay('tickets');
    } catch (error) {
      console.error('❌ Error updating tickets badge:', error);
      this.badgeData.tickets = 0;
      this.updateBadgeDisplay('tickets');
    }
  }

  async updateNewsfeedBadge() {
    try {
      if (!window.db) return;

      let unreadCount = 0;

      // Count new posts that mention the user or are from followed users
      const postsRef = window.db.ref('posts');
      const snapshot = await postsRef.orderByChild('timestamp')
        .startAt(this.lastSeen.newsfeed.getTime())
        .once('value');

      const posts = snapshot.val();
      if (posts) {
        Object.values(posts).forEach(post => {
          // Check if post mentions user or is from someone they follow
          const mentionsUser = post.tagged && post.tagged.includes(this.currentUser.uid);
          const fromOtherUser = post.userId !== this.currentUser.uid;
          
          if ((mentionsUser || fromOtherUser) && new Date(post.timestamp) > this.lastSeen.newsfeed) {
            unreadCount++;
          }
        });
      }

      this.badgeData.newsfeed = unreadCount;
      this.updateBadgeDisplay('newsfeed');
    } catch (error) {
      console.error('❌ Error updating newsfeed badge:', error);
    }
  }

  async updateRecognitionBadge() {
    try {
      if (!window.firebase || !window.firebase.firestore) return;

      const db = firebase.firestore();
      
      // Count new recognition notes since last seen
      const notesSnapshot = await db.collection('recognition-notes')
        .where('timestamp', '>', this.lastSeen.recognition)
        .get();

      this.badgeData.recognition = notesSnapshot.size;
      this.updateBadgeDisplay('recognition');
    } catch (error) {
      console.error('❌ Error updating recognition badge:', error);
    }
  }

  async updateGalleryBadge() {
    try {
      if (!window.db) return;

      let unreadCount = 0;

      // Count new best practice and attention items since last seen
      const galleryRef = window.db.ref('gallery-images');
      const snapshot = await galleryRef.orderByChild('uploadDate')
        .startAt(this.lastSeen.gallery.toISOString())
        .once('value');

      const images = snapshot.val();
      if (images) {
        Object.values(images).forEach(image => {
          const uploadDate = new Date(image.uploadDate);
          const isNewBestPractice = image.bestPractice === true && uploadDate > this.lastSeen.gallery;
          const isNewAttention = image.needsAttention === true && uploadDate > this.lastSeen.gallery;
          
          if (isNewBestPractice || isNewAttention) {
            unreadCount++;
          }
        });
      }

      this.badgeData.gallery = unreadCount;
      this.updateBadgeDisplay('gallery');
    } catch (error) {
      console.error('❌ Error updating gallery badge:', error);
    }
  }

  updateBadgeDisplay(pageType) {
    const count = this.badgeData[pageType];
    
    // Map page types to sidebar link selectors
    const selectorMap = {
      messages: 'a[href="messages.html"]',
      tickets: 'a[href="tickets.html"]', 
      newsfeed: 'a[href="newsfeed.html"]',
      recognition: 'a[href="recognition-board.html"]',
      gallery: 'a[href="best-practice.html"]'
    };

    const linkSelector = selectorMap[pageType];
    if (!linkSelector) {
      console.warn(`⚠️ No selector found for page type: ${pageType}`);
      return;
    }

    const linkElement = document.querySelector(linkSelector);
    if (!linkElement) {
      console.warn(`⚠️ No link element found for selector: ${linkSelector}`);
      return;
    }

    // Remove existing badge
    const existingBadge = linkElement.querySelector('.notification-badge');
    if (existingBadge) {
      existingBadge.remove();
      console.log(`🗑️ Removed existing badge for ${pageType}`);
    }

    // Add new badge if count > 0
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'notification-badge';
      badge.textContent = count > 99 ? '99+' : count.toString();
      linkElement.appendChild(badge);
      console.log(`✨ Added badge for ${pageType} with count: ${count}`);
    } else {
      console.log(`✅ No badge needed for ${pageType} (count: ${count})`);
    }
  }

  setupRealTimeListeners() {
    try {
      // Set up listeners for real-time updates
      this.setupMessagesListener();
      this.setupTicketsListener();
      this.setupNewsfeedListener();
      this.setupRecognitionListener();
      this.setupGalleryListener();
      
      console.log('👂 Real-time listeners setup complete');
    } catch (error) {
      console.error('❌ Error setting up real-time listeners:', error);
    }
  }

  setupMessagesListener() {
    if (!window.firebase || !window.firebase.firestore) return;

    const db = firebase.firestore();
    
    // Set up listener for chats where user is a participant
    try {
      const chatsListener = db.collection('chats')
        .where('participants', 'array-contains', this.currentUser.email)
        .onSnapshot((chatsSnapshot) => {
          // For each chat, set up message listeners
          chatsSnapshot.docs.forEach(chatDoc => {
            const chatId = chatDoc.id;
            
            const messagesListener = db.collection('chat-messages')
              .where('chatId', '==', chatId)
              .where('timestamp', '>', new Date())
              .onSnapshot((messagesSnapshot) => {
                messagesSnapshot.docChanges().forEach((change) => {
                  if (change.type === 'added') {
                    const messageData = change.doc.data();
                    // Only count if message is not from current user
                    if (messageData.senderEmail !== this.currentUser.email) {
                      this.badgeData.messages++;
                      this.updateBadgeDisplay('messages');
                    }
                  }
                });
              }, (error) => {
                console.log(`📧 Real-time message listener error for chat ${chatId}:`, error.message);
              });
            
            this.listeners.push(messagesListener);
          });
        }, (error) => {
          console.log('📧 Real-time chats listener error:', error.message);
        });

      this.listeners.push(chatsListener);
    } catch (error) {
      console.log('📧 Could not set up real-time message listeners:', error.message);
    }
  }

  setupTicketsListener() {
    if (!window.firebase || !window.firebase.firestore) return;

    const db = firebase.firestore();
    
    // Listen for all new tickets and filter client-side (since tickets can be assigned to teams)
    try {
      const listener = db.collection('tickets')
        .onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const ticketData = change.doc.data();
              const ticketDate = ticketData.createdAt ? ticketData.createdAt.toDate() : new Date();
              
              // Only process if ticket is newer than last seen
              if (ticketDate > this.lastSeen.tickets) {
                // Check if assigned to current user
                const isAssignedToUser = 
                  ticketData.assignedTo?.email === this.currentUser.email ||
                  ticketData.assignedTo?.teamMembers?.some(member => member.email === this.currentUser.email) ||
                  (ticketData.assignedTo === this.currentUser.email); // legacy format
                
                if (isAssignedToUser) {
                  this.updateTicketsBadge();
                }
              }
            }
          });
        }, (error) => {
          console.log('🎫 Real-time tickets listener error:', error.message);
        });

      this.listeners.push(listener);
    } catch (error) {
      console.log('🎫 Could not set up real-time tickets listener:', error.message);
    }
  }

  setupNewsfeedListener() {
    if (!window.db) return;

    // Listen for new posts
    const postsRef = window.db.ref('posts');
    const listener = postsRef.on('child_added', (snapshot) => {
      const post = snapshot.val();
      const postDate = new Date(post.timestamp);
      
      // Only count if post is newer than last seen and from other users
      if (postDate > this.lastSeen.newsfeed && post.userId !== this.currentUser.uid) {
        this.badgeData.newsfeed++;
        this.updateBadgeDisplay('newsfeed');
      }
    });

    this.listeners.push(() => postsRef.off('child_added', listener));
  }

  setupRecognitionListener() {
    if (!window.firebase || !window.firebase.firestore) return;

    const db = firebase.firestore();
    
    // Listen for new recognition notes
    const listener = db.collection('recognition-notes')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const noteData = change.doc.data();
            const noteDate = noteData.timestamp ? noteData.timestamp.toDate() : new Date();
            
            if (noteDate > this.lastSeen.recognition) {
              this.badgeData.recognition++;
              this.updateBadgeDisplay('recognition');
            }
          }
        });
      });

    this.listeners.push(listener);
  }

  setupGalleryListener() {
    if (!window.db) return;

    // Listen for new gallery images
    const galleryRef = window.db.ref('gallery-images');
    const listener = galleryRef.on('child_added', (snapshot) => {
      const image = snapshot.val();
      const uploadDate = new Date(image.uploadDate);
      
      // Only count best practice or attention items newer than last seen
      if (uploadDate > this.lastSeen.gallery && 
          (image.bestPractice === true || image.needsAttention === true)) {
        this.badgeData.gallery++;
        this.updateBadgeDisplay('gallery');
      }
    });

    this.listeners.push(() => galleryRef.off('child_added', listener));
  }

  cleanup() {
    // Remove all listeners
    this.listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners = [];
    this.isInitialized = false;
    console.log('🧹 Notification badge system cleaned up');
  }
}

// Global instance
window.notificationBadges = new NotificationBadgeManager();

// Helper function for pages to mark themselves as seen
window.markPageAsSeen = async function(pageType) {
  try {
    if (window.notificationBadges) {
      await window.notificationBadges.updateLastSeen(pageType);
    } else {
      console.warn('⚠️ Notification badges not available');
    }
  } catch (error) {
    console.error('❌ Error marking page as seen:', error);
  }
};

// Initialize when auth state changes
if (window.firebase && window.firebase.auth) {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Small delay to ensure Firebase services are ready
      setTimeout(() => {
        window.notificationBadges.initialize(user);
      }, 1000);
    } else {
      window.notificationBadges.cleanup();
    }
  });
}

// Page visibility change handler - update badges when page becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.notificationBadges.isInitialized) {
    window.notificationBadges.updateAllBadgeCounts();
  }
});

console.log('🔔 Notification badge system loaded');