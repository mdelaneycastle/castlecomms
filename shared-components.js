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
    this.loadSidebar();
    this.setupAuthStateHandler();
    this.setupNotificationBell();
    console.log("✅ Shared components loaded");
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

      console.log("📂 Sidebar loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load sidebar:", error);
    }
  },

  // Setup sidebar hamburger menu events
  setupSidebarEvents() {
    const toggleBtn = document.getElementById("menu-toggle");
    const closeBtn = document.getElementById("close-btn");
    const sidebar = document.getElementById("sidebar");
    const signoutBtn = document.getElementById("signout-btn");
    
    if (toggleBtn && sidebar) {
      toggleBtn.onclick = () => sidebar.classList.add("show");
    }
    
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
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('show');
        }
      }
    });
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

      // Update admin permissions
      if (window.authUtils) {
        await window.authUtils.toggleAdminElements(user);
      }

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
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.sharedComponents;
}