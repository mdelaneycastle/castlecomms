# Error Handling Implementation Guide

This document outlines the comprehensive error handling system implemented throughout the Castle Comms website.

## Overview

The error handling system provides:
- ✅ Consistent error messages across the application
- ✅ Proper error logging for debugging
- ✅ User-friendly error displays
- ✅ Graceful degradation when services fail
- ✅ Loading states and user feedback
- ✅ Input validation and sanitization

## Error Handling Architecture

### 1. Centralized Error Handler

**Location**: `firebase-init.js`
**Function**: `window.handleFirebaseError(error, operation)`

```javascript
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
```

### 2. Shared Components Error Utilities

**Location**: `shared-components.js`

```javascript
// Show loading state
showLoading(element, message = "Loading...")

// Show error message
showError(element, message)

// Show success message  
showSuccess(element, message)

// Sanitize user input
sanitizeHTML(str)

// Validate email format
isValidEmail(email)
```

## Implementation Details

### 1. Authentication Error Handling

**File**: `index.html`
- Login form with loading states
- Password reset with error handling
- User-friendly error messages

**Key Features**:
- Firebase authentication errors mapped to user-friendly messages
- Loading indicators during authentication
- Input validation before submission

### 2. User Management Error Handling

**File**: `script.js` - User functions
- `createUser()`: Input validation, HTTP error handling
- `listUsers()`: Permission checking, network error handling  
- `updateUser()`: Validation, confirmation dialogs

**Key Features**:
- Client-side input validation
- Server response error parsing
- Loading states during operations
- Success/failure feedback

### 3. Post Submission Error Handling

**File**: `script.js` - Post form
- Message validation
- File upload validation (size, type)
- Network error handling
- User feedback

**Key Features**:
- Input sanitization for XSS prevention
- File size and type validation
- Graceful mention processing (continues if fails)
- Button state management during submission

### 4. Admin Panel Error Handling

**File**: `admin.html` + `script.js`
- Permission validation
- User table loading with error states
- Form submission error handling

**Key Features**:
- Admin permission verification
- Table loading states
- Error display in table format
- Form validation and feedback

## Error Types and Handling

### 1. Authentication Errors

| Error Code | User Message | Action |
|------------|-------------|---------|
| `auth/user-not-found` | "No user account found with this email." | Allow retry |
| `auth/wrong-password` | "Incorrect password. Please try again." | Allow retry |
| `auth/invalid-email` | "Please enter a valid email address." | Highlight field |
| `auth/user-disabled` | "This account has been disabled." | Contact admin |
| `auth/too-many-requests` | "Too many failed attempts. Please try again later." | Wait period |

### 2. Network Errors

| Error Type | User Message | Action |
|------------|-------------|---------|
| `network-request-failed` | "Network error. Please check your connection." | Retry option |
| `CORS error` | "Connection error. Please try again." | Retry option |
| `Timeout` | "Request timed out. Please try again." | Retry option |

### 3. Validation Errors

| Validation | Error Message | Prevention |
|------------|---------------|------------|
| Empty email | "Email is required." | Client validation |
| Invalid email | "Please enter a valid email address." | Regex validation |
| Short password | "Password must be at least 6 characters long." | Length check |
| Large file | "Image file must be smaller than 10MB." | Size check |
| Invalid file type | "Please select a valid image file." | Type check |

### 4. Permission Errors

| Error Type | User Message | Action |
|------------|-------------|---------|
| `permission-denied` | "You do not have permission to perform this action." | Redirect/hide |
| Admin required | "Access denied. Admin privileges required." | Redirect to main |
| Not authenticated | "Authentication required. Please sign in first." | Redirect to login |

## Loading States Implementation

### Button States
```javascript
// Before operation
button.disabled = true;
button.textContent = "Loading...";

// After operation (in finally block)
button.disabled = false;
button.textContent = "Original Text";
```

### Content Loading
```javascript
// Show loading
window.sharedComponents.showLoading(element, "Loading data...");

// Show content or error
try {
  // Load content
  element.innerHTML = content;
} catch (error) {
  window.sharedComponents.showError(element, errorMessage);
}
```

## Error Logging

### Console Logging Standards
- ✅ Success operations: `console.log("✅ Operation completed")`
- ⚠️ Warnings: `console.warn("⚠️ Non-critical issue")`
- ❌ Errors: `console.error("❌ Operation failed:", error)`

### User Feedback Standards
- Success: Green text with checkmark ✅
- Warning: Yellow/orange text with warning ⚠️  
- Error: Red text with X mark ❌
- Loading: Blue text with spinner 🔄

## Input Validation and Sanitization

### Client-Side Validation
```javascript
// Email validation
if (!email || !window.sharedComponents.isValidEmail(email)) {
  throw new Error("Please provide a valid email address.");
}

// Password validation
if (!password || password.length < 6) {
  throw new Error("Password must be at least 6 characters long.");
}

// File validation
if (file.size > 10 * 1024 * 1024) {
  throw new Error("Image file must be smaller than 10MB.");
}
```

### Input Sanitization
```javascript
// Sanitize HTML to prevent XSS
const sanitizedMessage = window.sharedComponents.sanitizeHTML(userInput);

// Use in database operations
await postRef.set({
  message: sanitizedMessage,
  // ... other fields
});
```

## Error Recovery Strategies

### 1. Graceful Degradation
- If mentions fail to process, continue with post creation
- If user avatar fails to load, show initials instead
- If sidebar fails to load, show fallback navigation

### 2. Retry Mechanisms
- Network requests include retry logic
- User can manually retry failed operations
- Automatic token refresh for authentication

### 3. Fallback Content
- Default user names if display name unavailable
- Placeholder content for failed loads
- Offline-friendly error messages

## Monitoring and Debugging

### Development Mode
- Detailed error logging to console
- Full error stack traces
- Debug information display

### Production Mode
- User-friendly error messages only
- Error reporting to monitoring service
- Minimal sensitive information exposure

## Best Practices Implemented

1. **Always handle promises**: Every async operation wrapped in try-catch
2. **Validate early**: Check inputs before expensive operations
3. **Provide feedback**: Show loading states and results to user
4. **Log appropriately**: Different log levels for different scenarios
5. **Sanitize inputs**: Prevent XSS and injection attacks
6. **Fail gracefully**: Continue operation when non-critical parts fail
7. **User-friendly messages**: Convert technical errors to readable text
8. **Reset UI state**: Always restore button/form states after operations

## Testing Error Scenarios

### Manual Testing Checklist
- [ ] Submit empty forms
- [ ] Submit invalid email addresses
- [ ] Submit too-short passwords
- [ ] Upload oversized files
- [ ] Upload invalid file types
- [ ] Test with network disconnected
- [ ] Test with invalid authentication tokens
- [ ] Test admin functions as non-admin user
- [ ] Test rapid successive operations

### Automated Testing
- Unit tests for validation functions
- Integration tests for error scenarios
- End-to-end tests for user workflows

## Future Improvements

1. **Error Reporting Service**: Integrate with Sentry or similar
2. **Offline Support**: Handle offline scenarios gracefully
3. **Retry Logic**: Automatic retry for transient failures
4. **User Notifications**: Toast notifications instead of alerts
5. **Error Analytics**: Track common error patterns
6. **Internationalization**: Multi-language error messages