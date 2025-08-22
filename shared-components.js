// Shared Components and Utilities for Castle Comms
// This file centralizes common functionality to reduce code duplication

console.log("🔧 Shared components initialized");

// Initialize shared components when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  if (window.sharedComponents) {
    window.sharedComponents.init();
  }
});

window.sharedComponents = {
  // Initialize all shared components
  init() {
    this.loadHeader();
    this.loadSidebar();
    this.setupAuthStateHandler();
    this.setupNotificationBell();
    this.setupGlobalEventDelegation();
    console.log("✅ Shared components loaded");
  },

  // Setup global event delegation for dynamically loaded elements
  setupGlobalEventDelegation() {
    // Use event delegation to handle hamburger menu clicks regardless of loading order
    document.addEventListener('click', (e) => {
      if (e.target.closest('#menu-toggle')) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
          sidebar.classList.add('show');
        }
      }
    });
  },

  // Load and setup header with user name display
  async loadHeader() {
    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;

    try {
      const response = await fetch(`header.html?v=${Date.now()}`);
      const html = await response.text();
      headerContainer.innerHTML = html;

      // Set page title based on current page
      this.setPageTitle();

      // Setup hamburger menu event after header is loaded
      this.setupHeaderEvents();

      console.log("📋 Header loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load header:", error);
    }
  },

  // Setup header events (hamburger menu and profile dropdown)
  setupHeaderEvents() {
    const toggleBtn = document.getElementById("menu-toggle");
    
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        const sidebarElement = document.getElementById("sidebar");
        if (sidebarElement) {
          sidebarElement.classList.add("show");
        }
      };
      console.log("🍔 Hamburger menu event bound successfully");
    } else {
      console.warn("⚠️ Hamburger menu button not found - will retry");
      // Retry after a short delay in case sidebar isn't loaded yet
      setTimeout(() => {
        const retryToggleBtn = document.getElementById("menu-toggle");
        if (retryToggleBtn) {
          retryToggleBtn.onclick = () => {
            const sidebarElement = document.getElementById("sidebar");
            if (sidebarElement) {
              sidebarElement.classList.add("show");
            }
          };
          console.log("🍔 Hamburger menu event bound on retry");
        }
      }, 100);
    }

    // Setup user profile dropdown
    this.setupUserProfileDropdown();
  },

  // Set page title based on current page
  setPageTitle() {
    const pageTitleElement = document.getElementById("page-title");
    if (!pageTitleElement) return;

    const pathname = window.location.pathname;
    const filename = pathname.split('/').pop() || 'index.html';
    
    const titles = {
      'main.html': 'MAIN',
      'teams.html': 'TEAMS/GROUPS',
      'tickets.html': 'TICKETS',
      'newsfeed.html': 'NEWSFEED',
      'staff.html': 'STAFF',
      'messages.html': 'CHAT',
      'best-practice.html': 'DISPLAY REVIEW',
      'recognition-board.html': 'RECOGNITION BOARD',
      'planner.html': 'PLANNER',
      'news-mentions.html': 'NEWS MENTIONS',
      'manual.html': 'MANUAL',
      'communications.html': 'COMMUNICATIONS',
      'admin.html': 'ADMIN'
    };

    pageTitleElement.textContent = titles[filename] || 'CASTLE COMMS';
  },

  // Update user name display in header
  async updateUserNameDisplay(user) {
    const userNameElement = document.getElementById('user-name-display');
    if (!userNameElement) return;
    
    try {
      const displayName = await this.getUserDisplayName(user);
      userNameElement.textContent = displayName;
    } catch (error) {
      console.error('Error updating user name display:', error);
      userNameElement.textContent = this.extractNameFromEmail(user?.email || '');
    }
  },

  // Get user display name from Firebase Realtime Database
  async getUserDisplayName(user) {
    try {
      if (!user) {
        return 'Guest';
      }

      // Initialize Firebase Realtime Database if not already done
      if (!window.db) {
        window.db = firebase.database();
      }

      const userRef = window.db.ref(`users/${user.uid}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();

      if (userData && userData.name) {
        return userData.name;
      }

      // Fallback to Firebase Auth displayName
      if (user.displayName) {
        return user.displayName;
      }

      // Final fallback to email extraction
      return this.extractNameFromEmail(user.email || '');
    } catch (error) {
      console.error('Error getting user display name:', error);
      return this.extractNameFromEmail(user?.email || '');
    }
  },

  // Extract name from email
  extractNameFromEmail(email) {
    if (!email) return 'User';
    
    const emailName = email.split('@')[0];
    return emailName
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  // Setup user profile dropdown functionality
  setupUserProfileDropdown() {
    const profileBtn = document.getElementById('user-profile-btn');
    const dropdownMenu = document.getElementById('profile-dropdown-menu');
    const signoutBtn = document.getElementById('profile-signout-btn');
    const accountSettingsBtn = document.getElementById('account-settings-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');

    if (!profileBtn || !dropdownMenu) {
      console.warn('⚠️ User profile dropdown elements not found');
      return;
    }

    // Toggle dropdown on profile button click
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-profile-dropdown')) {
        dropdownMenu.classList.remove('show');
      }
    });

    // Sign out functionality
    if (signoutBtn) {
      signoutBtn.addEventListener('click', async () => {
        try {
          await firebase.auth().signOut();
          window.location.href = 'index.html';
        } catch (error) {
          console.error('Error signing out:', error);
          alert('Error signing out. Please try again.');
        }
      });
    }

    // Account settings functionality
    if (accountSettingsBtn) {
      accountSettingsBtn.addEventListener('click', () => {
        this.openAccountSettingsModal();
        dropdownMenu.classList.remove('show');
      });
    }

    // Change password functionality
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => {
        this.openChangePasswordModal();
        dropdownMenu.classList.remove('show');
      });
    }

    console.log('👤 User profile dropdown setup complete');
  },

  // Generate user initials from name
  generateUserInitials(displayName) {
    if (!displayName) return 'U';
    
    const nameParts = displayName.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length === 0) return 'U';
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    // Take first letter of first name and first letter of last name
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  },

  // Update user profile dropdown with user information
  async updateUserProfileDropdown(user) {
    if (!user) return;

    try {
      const displayName = await this.getUserDisplayName(user);
      const initials = this.generateUserInitials(displayName);

      // Load profile settings from Firebase
      const userRef = window.db.ref(`users/${user.uid}/profile`);
      const snapshot = await userRef.once('value');
      const profileData = snapshot.val() || {};

      // Update user profile button
      const userProfileBtn = document.getElementById('user-profile-btn');
      const userInitialsElement = document.getElementById('user-initials');
      
      if (userProfileBtn && userInitialsElement) {
        // Clear any existing photo styles
        userProfileBtn.style.backgroundImage = '';
        userProfileBtn.style.backgroundSize = '';
        userProfileBtn.style.backgroundPosition = '';
        
        if (profileData.photoURL) {
          // Use uploaded photo
          userProfileBtn.style.backgroundImage = `url(${profileData.photoURL})`;
          userProfileBtn.style.backgroundSize = 'cover';
          userProfileBtn.style.backgroundPosition = 'center';
          userInitialsElement.style.display = 'none';
        } else {
          // Use initials with custom color
          const backgroundColor = profileData.backgroundColor || '#45494E';
          userProfileBtn.style.backgroundColor = backgroundColor;
          userInitialsElement.textContent = initials;
          userInitialsElement.style.display = 'flex';
        }
      }

      // Update dropdown header with user info
      const dropdownUserName = document.getElementById('dropdown-user-name');
      const dropdownUserEmail = document.getElementById('dropdown-user-email');
      
      if (dropdownUserName) {
        dropdownUserName.textContent = displayName;
      }
      
      if (dropdownUserEmail) {
        dropdownUserEmail.textContent = user.email || '';
      }

    } catch (error) {
      console.error('Error updating user profile dropdown:', error);
      // Fallback to basic initials
      const userInitialsElement = document.getElementById('user-initials');
      if (userInitialsElement) {
        userInitialsElement.textContent = this.generateUserInitials(this.extractNameFromEmail(user?.email || ''));
      }
    }
  },

  // Load and setup sidebar with permissions
  async loadSidebar() {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) return;

    try {
      const response = await fetch(`sidebar.html?v=${Date.now()}`);
      const html = await response.text();
      sidebarContainer.innerHTML = html;

      // Set up sidebar events
      this.setupSidebarEvents();

      // Set up admin permissions for current user
      const user = firebase.auth().currentUser;
      if (user && window.authUtils) {
        await window.authUtils.toggleAdminElements(user);
      }

      // Apply page visibility settings (hide pages from non-Marc users)
      await this.applyPageVisibilitySettings(user);

      console.log("📂 Sidebar loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load sidebar:", error);
    }
  },

  // Setup sidebar events (close button, signout, etc.)
  setupSidebarEvents() {
    const closeBtn = document.getElementById("close-btn");
    const sidebar = document.getElementById("sidebar");
    const signoutBtn = document.getElementById("signout-btn");
    const toggleBtn = document.getElementById("menu-toggle");
    
    if (closeBtn && sidebar) {
      closeBtn.onclick = () => sidebar.classList.remove("show");
    }

    // Setup signout functionality
    if (signoutBtn) {
      signoutBtn.onclick = (e) => {
        e.preventDefault();
        this.handleSignout();
      };
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      if (sidebar && sidebar.classList.contains('show')) {
        if (!sidebar.contains(e.target) && toggleBtn && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('show');
        }
      }
    });
  },

  // Apply page visibility settings based on Firebase database
  async applyPageVisibilitySettings(user) {
    try {
      // Only hide pages for users who are NOT Marc
      if (user && user.email === 'mdelaney@castlefineart.com') {
        // Marc can see everything - no restrictions
        return;
      }

      // For all other users, check visibility settings from Firestore
      const db = firebase.firestore();
      const docRef = db.collection('settings').doc('page-visibility');
      const doc = await docRef.get();
      const settings = doc.exists ? doc.data() : {};

      // Map of page IDs to their sidebar link elements
      const pageElementMap = {
        'main': 'a[href="main.html"]',
        'planner': 'a[href="planner.html"]', 
        'staff': 'a[href="staff.html"]',
        'address-book': '#address-book-link',
        'art-workflow': 'a[href="art-workflow.html"]',
        'newsfeed': 'a[href="newsfeed.html"]',
        'messages': 'a[href="messages.html"]',
        'tickets': 'a[href="tickets.html"]',
        'communications': 'a[href="communications.html"]',
        'recognition-board': 'a[href="recognition-board.html"]',
        'reports': 'a[href="reports.html"]',
        'manual': 'a[href="manual.html"]',
        'best-practice': 'a[href="best-practice.html"]'
      };

      // Hide pages that are set to false in the visibility settings
      Object.entries(pageElementMap).forEach(([pageId, selector]) => {
        if (settings[pageId] === false) {
          const element = document.querySelector(selector);
          if (element) {
            // Hide the parent li element
            const listItem = element.closest('li');
            if (listItem) {
              listItem.style.display = 'none';
            }
          }
        }
      });

    } catch (error) {
      console.error('Error applying page visibility settings:', error);
    }
  },

  // Handle user signout
  async handleSignout() {
    try {
      // Clear any local storage or session storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out from Firebase
      await firebase.auth().signOut();
      
      console.log("👋 User signed out successfully");
      
      // Force a hard redirect to clear any cached state
      window.location.replace('index.html');
    } catch (error) {
      console.error("❌ Error signing out:", error);
      alert("Error signing out. Please try again.");
    }
  },

  // Centralized authentication state handler
  setupAuthStateHandler() {
    if (!firebase || !firebase.auth) {
      console.warn("⚠️ Firebase Auth not available for state handler");
      return;
    }

    firebase.auth().onAuthStateChanged(async (user) => {
      // Check if we're on the login page
      const isLoginPage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/";
      
      if (!user) {
        // User is not authenticated
        if (!isLoginPage) {
          // Redirect to login page if not already there
          console.log("User not authenticated, redirecting to login");
          window.location.replace('index.html');
          return;
        }
        console.log("User not authenticated on login page");
        return;
      }

      // User is authenticated
      console.log("👤 User authenticated:", user.email);

      // If user is authenticated and on login page, redirect to main
      if (isLoginPage) {
        console.log("Authenticated user on login page, redirecting to main");
        window.location.replace('main.html');
        return;
      }

      // Update user name display in header
      await this.updateUserNameDisplay(user);

      // Update user profile dropdown
      await this.updateUserProfileDropdown(user);

      // Update admin permissions
      if (window.authUtils) {
        await window.authUtils.toggleAdminElements(user);
      }

      // Update user-specific elements visibility
      this.toggleUserSpecificElements(user);

      // Load sidebar if it hasn't been loaded yet
      if (!document.getElementById("sidebar")) {
        this.loadSidebar();
      }
    });
  },

  // Setup notification bell functionality
  setupNotificationBell() {
    const bell = document.getElementById("notification-bell");
    const countBadge = document.getElementById("notification-count");
    
    if (!bell || !countBadge) return;

    let mentionCount = 0;

    // Function to show notification bell
    function showBell(count) {
      countBadge.textContent = count;
      bell.classList.remove("hidden");
    }

    // Listen for mentions in posts
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user || !window.db) return;

      const uid = user.uid;
      
      // Listen for new posts that mention this user
      window.db.ref("posts").on("child_added", (snap) => {
        const post = snap.val();
        if (post.tagged && post.tagged.includes(uid) && post.userId !== uid) {
          mentionCount++;
          showBell(mentionCount);
        }
      });

      // Bell click handler
      bell.addEventListener("click", () => {
        mentionCount = 0;
        bell.classList.add("hidden");
        window.location.href = "newsfeed.html";
      });
    });
  },

  // Utility: Show loading state
  showLoading(element, message = "Loading...") {
    if (element) {
      element.innerHTML = `<div class="loading-spinner">🔄 ${message}</div>`;
      element.style.opacity = "0.7";
    }
  },

  // Utility: Hide loading state
  hideLoading(element) {
    if (element) {
      element.style.opacity = "1";
    }
  },

  // Utility: Show error message
  showError(element, message) {
    if (element) {
      element.innerHTML = `<div class="error-message">❌ ${message}</div>`;
      element.style.color = "red";
    }
  },

  // Utility: Show success message
  showSuccess(element, message) {
    if (element) {
      element.innerHTML = `<div class="success-message">✅ ${message}</div>`;
      element.style.color = "green";
    }
  },

  // Format timestamp for consistent display
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  },

  // Create user avatar with initials
  createUserAvatar(name, size = 40) {
    const initials = name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const div = document.createElement("div");
    div.className = "user-avatar";
    div.textContent = initials;
    div.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #374151;
      font-size: ${Math.floor(size * 0.4)}px;
    `;

    return div;
  },

  // Sanitize user input to prevent XSS
  sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Show confirmation dialog
  async confirm(message, title = "Confirm Action") {
    return new Promise((resolve) => {
      const result = window.confirm(`${title}\n\n${message}`);
      resolve(result);
    });
  },

  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return false;
    }
  },

  // Debounce function for search/input
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Get user display name from Firebase Realtime Database
  async getUserDisplayName(user) {
    try {
      if (!user || !window.db) {
        return this.extractNameFromEmail(user?.email || '');
      }

      const userRef = window.db.ref(`users/${user.uid}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();

      if (userData && userData.name) {
        return userData.name;
      }

      // Fallback to Firebase Auth displayName
      if (user.displayName) {
        return user.displayName;
      }

      // Final fallback to email extraction
      return this.extractNameFromEmail(user.email || '');
    } catch (error) {
      console.error('Error getting user display name:', error);
      return this.extractNameFromEmail(user?.email || '');
    }
  },

  // Extract name from email as fallback
  extractNameFromEmail(email) {
    if (!email) return 'User';
    
    const emailName = email.split('@')[0];
    return emailName
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  // Toggle user-specific elements based on email
  toggleUserSpecificElements(user) {
    const userOnlyElements = document.querySelectorAll('[data-user-only]');
    
    userOnlyElements.forEach(element => {
      const allowedEmail = element.getAttribute('data-user-only');
      if (user && user.email && user.email.toLowerCase() === allowedEmail.toLowerCase()) {
        element.style.display = '';
      } else {
        element.style.display = 'none';
      }
    });
  },

  // Open change password modal
  openChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (!modal) {
      console.error('Change password modal not found');
      return;
    }

    // Show modal
    modal.style.display = 'block';

    // Setup modal events
    this.setupChangePasswordModalEvents();

    // Focus on first input
    setTimeout(() => {
      const firstInput = modal.querySelector('#current-password');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  },

  // Setup change password modal events
  setupChangePasswordModalEvents() {
    const modal = document.getElementById('change-password-modal');
    const closeBtn = document.getElementById('change-password-close');
    const cancelBtn = document.getElementById('change-password-cancel');
    const form = document.getElementById('change-password-form');

    // Close modal events
    const closeModal = () => {
      modal.style.display = 'none';
      form.reset();
    };

    // Close button
    if (closeBtn) {
      closeBtn.onclick = closeModal;
    }

    // Cancel button
    if (cancelBtn) {
      cancelBtn.onclick = closeModal;
    }

    // Click outside modal to close
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
      }
    });

    // Form submission
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        this.handlePasswordChange();
      };
    }
  },

  // Handle password change submission
  async handlePasswordChange() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const submitBtn = document.querySelector('#change-password-form button[type="submit"]');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      alert('New password must be different from current password');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Changing Password...';

    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error('No user is currently signed in');
      }

      // Create credential with current password
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      // Re-authenticate user with current password
      await user.reauthenticateWithCredential(credential);

      // Update password
      await user.updatePassword(newPassword);

      // Success
      alert('Password changed successfully!');
      
      // Close modal
      const modal = document.getElementById('change-password-modal');
      modal.style.display = 'none';
      document.getElementById('change-password-form').reset();

      console.log('✅ Password changed successfully');

    } catch (error) {
      console.error('❌ Error changing password:', error);
      
      // Handle specific error cases
      let errorMessage = 'Failed to change password. ';
      
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage += 'Current password is incorrect.';
          break;
        case 'auth/weak-password':
          errorMessage += 'New password is too weak.';
          break;
        case 'auth/requires-recent-login':
          errorMessage += 'Please sign out and sign back in, then try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage += 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage += error.message || 'Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Change Password';
    }
  },

  // Open account settings modal
  async openAccountSettingsModal() {
    const modal = document.getElementById('account-settings-modal');
    if (!modal) {
      console.error('Account settings modal not found');
      return;
    }

    // Load current user settings
    await this.loadCurrentAccountSettings();

    // Show modal
    modal.style.display = 'block';

    // Setup modal events
    this.setupAccountSettingsModalEvents();

    // Focus on display name input
    setTimeout(() => {
      const displayNameInput = modal.querySelector('#display-name-input');
      if (displayNameInput) {
        displayNameInput.focus();
      }
    }, 100);
  },

  // Load current account settings into modal
  async loadCurrentAccountSettings() {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return;

      // Load display name
      const displayName = await this.getUserDisplayName(user);
      const displayNameInput = document.getElementById('display-name-input');
      if (displayNameInput) {
        displayNameInput.value = displayName;
      }

      // Load current profile settings from Firebase
      const userRef = window.db.ref(`users/${user.uid}/profile`);
      const snapshot = await userRef.once('value');
      const profileData = snapshot.val() || {};

      // Update preview
      await this.updateAccountSettingsPreview(displayName, profileData);

      // Set selected color
      const selectedColor = profileData.backgroundColor || '#45494E';
      const colorOptions = document.querySelectorAll('.color-option');
      colorOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.color === selectedColor) {
          option.classList.add('selected');
        }
      });

      // Handle photo if exists
      if (profileData.photoURL) {
        const previewPhoto = document.getElementById('preview-photo');
        const removePhotoBtn = document.getElementById('remove-photo-btn');
        if (previewPhoto && removePhotoBtn) {
          previewPhoto.src = profileData.photoURL;
          previewPhoto.style.display = 'block';
          removePhotoBtn.style.display = 'block';
        }
      }

    } catch (error) {
      console.error('Error loading account settings:', error);
    }
  },

  // Update account settings preview
  async updateAccountSettingsPreview(displayName, profileData = {}) {
    const previewCircle = document.getElementById('profile-preview');
    const previewInitials = document.getElementById('preview-initials');
    const previewPhoto = document.getElementById('preview-photo');

    if (!previewCircle || !previewInitials) return;

    // Update initials
    const initials = this.generateUserInitials(displayName);
    previewInitials.textContent = initials;

    // Update background color
    const backgroundColor = profileData.backgroundColor || '#45494E';
    previewCircle.style.backgroundColor = backgroundColor;

    // Handle photo
    if (profileData.photoURL && previewPhoto) {
      previewPhoto.src = profileData.photoURL;
      previewPhoto.style.display = 'block';
      previewInitials.style.display = 'none';
    } else {
      if (previewPhoto) previewPhoto.style.display = 'none';
      previewInitials.style.display = 'block';
    }
  },

  // Setup account settings modal events
  setupAccountSettingsModalEvents() {
    const modal = document.getElementById('account-settings-modal');
    const closeBtn = document.getElementById('account-settings-close');
    const cancelBtn = document.getElementById('account-settings-cancel');
    const form = document.getElementById('account-settings-form');
    const colorOptions = document.querySelectorAll('.color-option');
    const photoInput = document.getElementById('profile-photo-input');
    const removePhotoBtn = document.getElementById('remove-photo-btn');
    const displayNameInput = document.getElementById('display-name-input');

    // Close modal events
    const closeModal = () => {
      modal.style.display = 'none';
    };

    // Close button
    if (closeBtn) {
      closeBtn.onclick = closeModal;
    }

    // Cancel button
    if (cancelBtn) {
      cancelBtn.onclick = closeModal;
    }

    // Click outside modal to close
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
      }
    });

    // Color selection
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Remove selected class from all options
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        // Add selected class to clicked option
        option.classList.add('selected');
        
        // Update preview
        const selectedColor = option.dataset.color;
        const previewCircle = document.getElementById('profile-preview');
        if (previewCircle) {
          previewCircle.style.backgroundColor = selectedColor;
        }
      });
    });

    // Photo upload
    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handlePhotoUpload(file);
        }
      });
    }

    // Remove photo
    if (removePhotoBtn) {
      removePhotoBtn.addEventListener('click', () => {
        this.removeProfilePhoto();
      });
    }

    // Display name input preview update
    if (displayNameInput) {
      displayNameInput.addEventListener('input', (e) => {
        const newDisplayName = e.target.value;
        const previewInitials = document.getElementById('preview-initials');
        if (previewInitials) {
          const initials = this.generateUserInitials(newDisplayName);
          previewInitials.textContent = initials;
        }
      });
    }

    // Form submission
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        this.handleAccountSettingsSave();
      };
    }
  },

  // Handle photo upload
  async handlePhotoUpload(file) {
    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const previewPhoto = document.getElementById('preview-photo');
        const previewInitials = document.getElementById('preview-initials');
        const removePhotoBtn = document.getElementById('remove-photo-btn');

        if (previewPhoto && previewInitials && removePhotoBtn) {
          previewPhoto.src = e.target.result;
          previewPhoto.style.display = 'block';
          previewInitials.style.display = 'none';
          removePhotoBtn.style.display = 'block';
        }
      };
      reader.readAsDataURL(file);

      // Store file for later upload
      this.pendingPhotoFile = file;

    } catch (error) {
      console.error('Error handling photo upload:', error);
      alert('Error processing image. Please try again.');
    }
  },

  // Remove profile photo
  removeProfilePhoto() {
    const previewPhoto = document.getElementById('preview-photo');
    const previewInitials = document.getElementById('preview-initials');
    const removePhotoBtn = document.getElementById('remove-photo-btn');
    const photoInput = document.getElementById('profile-photo-input');

    if (previewPhoto && previewInitials && removePhotoBtn && photoInput) {
      previewPhoto.style.display = 'none';
      previewInitials.style.display = 'block';
      removePhotoBtn.style.display = 'none';
      photoInput.value = '';
    }

    // Mark for removal
    this.removePhoto = true;
    this.pendingPhotoFile = null;
  },

  // Handle account settings save
  async handleAccountSettingsSave() {
    const displayNameInput = document.getElementById('display-name-input');
    const submitBtn = document.querySelector('#account-settings-form button[type="submit"]');
    const selectedColorOption = document.querySelector('.color-option.selected');

    if (!displayNameInput || !submitBtn) return;

    const newDisplayName = displayNameInput.value.trim();
    
    // Validation
    if (!newDisplayName) {
      alert('Please enter a display name');
      return;
    }

    if (newDisplayName.length > 50) {
      alert('Display name must be 50 characters or less');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error('No user is currently signed in');
      }

      // Prepare profile data
      const profileData = {
        backgroundColor: selectedColorOption ? selectedColorOption.dataset.color : '#45494E',
        lastUpdated: Date.now()
      };

      // Handle photo upload to Firebase Storage if needed
      if (this.pendingPhotoFile) {
        const photoURL = await this.uploadProfilePhoto(this.pendingPhotoFile, user.uid);
        profileData.photoURL = photoURL;
      } else if (this.removePhoto) {
        // Remove photo from storage and profile
        await this.deleteProfilePhoto(user.uid);
        profileData.photoURL = null;
      }

      // Update user profile in Firebase Realtime Database
      const userRef = window.db.ref(`users/${user.uid}`);
      await userRef.update({
        name: newDisplayName,
        profile: profileData
      });

      // Update Firebase Auth profile
      await user.updateProfile({
        displayName: newDisplayName
      });

      // Success
      alert('Account settings saved successfully!');
      
      // Update UI throughout the app
      await this.updateUserNameDisplay(user);
      await this.updateUserProfileDropdown(user);

      // Close modal
      const modal = document.getElementById('account-settings-modal');
      modal.style.display = 'none';

      // Reset flags
      this.pendingPhotoFile = null;
      this.removePhoto = false;

      console.log('✅ Account settings saved successfully');

    } catch (error) {
      console.error('❌ Error saving account settings:', error);
      alert('Failed to save account settings. Please try again.');
    } finally {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Changes';
    }
  },

  // Upload profile photo (fallback to base64 if Storage unavailable)
  async uploadProfilePhoto(file, userId) {
    try {
      // Check if Firebase Storage is available
      if (window.firebase && window.firebase.storage) {
        console.log('Using Firebase Storage for photo upload');
        const storage = firebase.storage();
        const storageRef = storage.ref();
        const photoRef = storageRef.child(`profile-photos/${userId}/${Date.now()}_${file.name}`);

        // Upload file
        const snapshot = await photoRef.put(file);
        
        // Get download URL
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        return downloadURL;
      } else {
        // Fallback to base64 data URL storage in database
        console.log('Firebase Storage not available, using base64 fallback');
        return await this.convertFileToBase64(file);
      }

    } catch (error) {
      console.error('Error uploading profile photo:', error);
      // If Firebase Storage fails, try base64 fallback
      console.log('Falling back to base64 storage');
      return await this.convertFileToBase64(file);
    }
  },

  // Convert file to base64 data URL
  async convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(new Error('Failed to convert image to base64'));
      };
      reader.readAsDataURL(file);
    });
  },

  // Delete profile photo from Firebase Storage or database
  async deleteProfilePhoto(userId) {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return;

      // Get current photo URL from database
      const userRef = window.db.ref(`users/${userId}/profile/photoURL`);
      const snapshot = await userRef.once('value');
      const photoURL = snapshot.val();

      if (photoURL) {
        // Check if it's a Firebase Storage URL or base64
        if (photoURL.startsWith('https://') && window.firebase && window.firebase.storage) {
          try {
            // Delete from Firebase Storage
            const storage = firebase.storage();
            const photoRef = storage.refFromURL(photoURL);
            await photoRef.delete();
            console.log('Photo deleted from Firebase Storage');
          } catch (storageError) {
            console.log('Could not delete from storage (may be base64):', storageError.message);
          }
        } else {
          // Base64 photo - no need to delete from storage, just remove from database
          console.log('Removing base64 photo from database');
        }
      }

    } catch (error) {
      console.error('Error deleting profile photo:', error);
      // Don't throw error - just log it since the main update should still work
    }
  }
};

// Dark mode toggle functionality (global)
let isDarkMode = localStorage.getItem('darkMode') === 'true';

function updateDarkModeUI() {
  const button = document.querySelector('.dark-mode-toggle');
  console.log('updateDarkModeUI - button found:', !!button, 'isDarkMode:', isDarkMode);
  if (button) {
    if (isDarkMode) {
      button.innerHTML = '<span class="dropdown-icon">☀️</span>Dark Mode: On';
    } else {
      button.innerHTML = '<span class="dropdown-icon">🌙</span>Dark Mode: Off';
    }
  }
}

function applyDarkMode() {
  if (isDarkMode) {
    // Apply dark mode filter
    document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
    
    // Create style element for images/videos to keep them normal
    const darkModeStyle = document.createElement('style');
    darkModeStyle.id = 'dark-mode-style';
    darkModeStyle.textContent = `
      img, video, canvas, picture, svg { 
        filter: invert(1) hue-rotate(180deg) !important; 
      }
    `;
    document.head.appendChild(darkModeStyle);
  } else {
    // Remove dark mode filter
    document.documentElement.style.filter = '';
    
    // Remove dark mode styles
    const darkModeStyle = document.getElementById('dark-mode-style');
    if (darkModeStyle) darkModeStyle.remove();
  }
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  
  // Apply or remove dark mode
  applyDarkMode();
  
  // Update UI
  updateDarkModeUI();
  
  // Store preference
  localStorage.setItem('darkMode', isDarkMode.toString());
}

// Load dark mode preference on page load
document.addEventListener('DOMContentLoaded', () => {
  // Apply dark mode if it was previously enabled
  applyDarkMode();
  
  // Wait a bit for header to load, then update UI
  setTimeout(() => {
    updateDarkModeUI();
  }, 100);
  
  // Also set up an observer to update UI when header loads
  const observer = new MutationObserver(() => {
    if (document.querySelector('.dark-mode-toggle')) {
      updateDarkModeUI();
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.sharedComponents;
}