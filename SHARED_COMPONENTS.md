# Shared Components Documentation

This document explains the shared components system implemented to reduce code duplication across the Castle Comms website.

## Overview

The `shared-components.js` file centralizes common functionality that was previously duplicated across multiple HTML files, improving maintainability and consistency.

## Components Included

### 1. Sidebar Management
- **loadSidebar()**: Automatically loads sidebar.html into pages
- **setupSidebarEvents()**: Handles hamburger menu toggle and close events
- **Outside click detection**: Closes sidebar when clicking outside

### 2. Authentication State Management
- **setupAuthStateHandler()**: Centralized auth state monitoring
- **Automatic login redirects**: Redirects unauthenticated users to login
- **Admin permission management**: Updates admin elements visibility

### 3. Notification System
- **setupNotificationBell()**: Handles mention notifications
- **Real-time updates**: Listens for new mentions in posts
- **Click handling**: Redirects to newsfeed on bell click

### 4. Utility Functions
- **showLoading/hideLoading**: Consistent loading states
- **showError/showSuccess**: Standardized message display
- **formatTimestamp**: Relative time formatting
- **createUserAvatar**: Generate user initials avatars
- **sanitizeHTML**: XSS prevention
- **isValidEmail**: Email validation
- **confirm**: Promise-based confirmation dialogs
- **copyToClipboard**: Clipboard utilities
- **debounce**: Input debouncing

## Usage

### Basic Implementation

Add to any HTML page:

```html
<!-- Firebase config -->
<script src="firebase-init.js"></script>

<!-- Shared components -->
<script src="shared-components.js"></script>

<!-- Page-specific scripts -->
<script src="script.js"></script>
```

### Automatic Initialization

Shared components initialize automatically when DOM is ready:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  if (window.sharedComponents) {
    window.sharedComponents.init();
  }
});
```

### Manual Usage

Access specific functions:

```javascript
// Show loading state
window.sharedComponents.showLoading(element, "Please wait...");

// Create user avatar
const avatar = window.sharedComponents.createUserAvatar("John Doe", 50);

// Format timestamp
const timeAgo = window.sharedComponents.formatTimestamp(Date.now() - 3600000);
```

## Removed Duplications

### Before (Duplicated Code)
Each HTML file contained:
- Sidebar loading fetch requests
- Auth state change handlers
- Sidebar event setup
- Admin permission checks

### After (Centralized)
- Single implementation in `shared-components.js`
- Automatic initialization
- Consistent behavior across pages
- Easier maintenance

## Code Reduction Summary

| File | Lines Removed | Functionality Moved |
|------|---------------|-------------------|
| main.html | ~20 lines | Sidebar loading, auth handling |
| planner.html | ~20 lines | Sidebar loading, auth handling |
| files.html | ~20 lines | Sidebar loading, auth handling |
| newsfeed.html | ~15 lines | Sidebar loading |
| admin.html | ~15 lines | Sidebar loading, simplified auth |
| script.js | ~10 lines | setupSidebarEvents function |

**Total**: ~100 lines of duplicated code eliminated

## Benefits

### Maintainability
- ✅ Single source of truth for common functionality
- ✅ Easier to fix bugs across entire application
- ✅ Consistent behavior across all pages

### Performance
- ✅ Reduced HTML file sizes
- ✅ Better caching (shared components cached once)
- ✅ Faster page load times

### Developer Experience
- ✅ Less code duplication to maintain
- ✅ Standardized utility functions
- ✅ Clear separation of concerns

### Consistency
- ✅ Uniform error handling
- ✅ Consistent loading states
- ✅ Standardized user interfaces

## Page-Specific Requirements

### Standard Pages (main.html, planner.html, files.html)
- Require: Firebase Auth, Shared Components
- Get: Automatic sidebar, auth handling, notifications

### Newsfeed (newsfeed.html)
- Requires: Firebase Auth, Database, Storage, Shared Components
- Gets: All standard features plus database integration

### Admin (admin.html)
- Requires: Firebase Auth, Shared Components
- Gets: Standard features plus admin-specific security

### Login (index.html)
- Minimal requirements: Firebase Auth only
- No shared components (login is separate flow)

## Error Handling

Shared components include built-in error handling:

```javascript
// Example: Sidebar loading with error handling
try {
  const response = await fetch("sidebar.html");
  const html = await response.text();
  sidebarContainer.innerHTML = html;
  console.log("📂 Sidebar loaded successfully");
} catch (error) {
  console.error("❌ Failed to load sidebar:", error);
}
```

## Future Extensions

The shared components system is designed for easy extension:

### Adding New Components
1. Add function to `window.sharedComponents` object
2. Call from `init()` method if auto-initialization needed
3. Document usage and benefits

### Adding New Utilities
1. Add utility function to shared components
2. Follow naming convention (camelCase)
3. Include error handling
4. Update documentation

## Migration Guide

To add shared components to a new page:

1. **Include the script**:
   ```html
   <script src="shared-components.js"></script>
   ```

2. **Remove duplicated code**:
   - Remove sidebar loading fetch
   - Remove auth state handlers (if generic)
   - Remove sidebar event setup

3. **Add page-specific logic only**:
   - Keep unique functionality
   - Use shared utilities where possible

4. **Test functionality**:
   - Verify sidebar works
   - Check auth redirects
   - Confirm admin permissions

## Best Practices

1. **Use shared utilities**: Before writing custom code, check if shared utility exists
2. **Maintain consistency**: Follow established patterns for new functionality
3. **Document changes**: Update this file when adding new components
4. **Test across pages**: Ensure changes work on all pages
5. **Handle errors**: Include appropriate error handling in extensions