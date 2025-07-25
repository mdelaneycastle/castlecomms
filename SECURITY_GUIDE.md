# Security Implementation Guide

This guide covers the security measures implemented for the Castle Comms internal website and deployment instructions.

## Overview

The website now includes multiple layers of security:
- ✅ HTTPS enforcement
- ✅ Security headers
- ✅ Firebase Security Rules  
- ✅ Custom claims authorization
- ✅ Client-side security measures

## Security Features Implemented

### 1. HTTPS Enforcement

**Client-side redirect** (in `firebase-init.js`):
- Automatically redirects HTTP to HTTPS
- Excludes local development environments

**Server-side configuration**:
- Apache: `.htaccess` file with RewriteRule
- Nginx: Server block with 301 redirect

### 2. Security Headers

Implemented via server configuration files:

#### X-Frame-Options: SAMEORIGIN
- Prevents clickjacking attacks
- Allows framing only from same origin

#### X-XSS-Protection: 1; mode=block
- Enables browser XSS filtering
- Blocks page if XSS detected

#### X-Content-Type-Options: nosniff
- Prevents MIME confusion attacks
- Forces browser to respect declared content types

#### Strict-Transport-Security (HSTS)
- Forces HTTPS for 1 year
- Includes subdomains
- Enables preloading

#### Content Security Policy (CSP)
- Restricts resource loading to trusted sources
- Allows specific Firebase and Google services
- Prevents inline script execution (with exceptions for necessary libraries)

#### Referrer-Policy: strict-origin-when-cross-origin
- Controls referrer information sent to other sites
- Protects user privacy

#### Permissions-Policy
- Disables unused browser features
- Blocks camera, microphone, geolocation access

### 3. Firebase Security

**Authentication**:
- Custom claims for role-based access
- Secure admin user management
- Token-based authorization

**Database Rules** (`database.rules.json`):
- User data isolation
- Admin-only operations
- Validated data structures

**Storage Rules** (`storage.rules`):
- File size limits
- Content type validation
- User-specific access control

## Deployment Instructions

### For Apache Servers

1. **Upload `.htaccess`** to website root directory
2. **Ensure mod_rewrite is enabled**:
   ```bash
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```
3. **Verify SSL certificate** is installed and valid

### For Nginx Servers

1. **Update configuration** using provided `nginx.conf`
2. **Adjust paths** for SSL certificates and website root
3. **Test configuration**:
   ```bash
   nginx -t
   sudo systemctl reload nginx
   ```

### For Firebase Hosting

Firebase Hosting automatically provides HTTPS and many security headers.

1. **Initialize Firebase Hosting**:
   ```bash
   firebase init hosting
   ```

2. **Deploy**:
   ```bash
   firebase deploy
   ```

## Testing Security Implementation

### 1. HTTPS Enforcement Test
- Visit `http://your-domain.com`
- Should automatically redirect to `https://your-domain.com`

### 2. Security Headers Test
Use online tools:
- [Security Headers](https://securityheaders.com/)
- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)

### 3. CSP Validation
- Check browser console for CSP violations
- Adjust policy if legitimate resources are blocked

### 4. Admin Access Test
- Login as non-admin user
- Verify admin links are hidden
- Try direct access to `/admin.html` - should redirect

## Security Monitoring

### Browser Console Monitoring
Check for:
- CSP violations
- Mixed content warnings
- Firebase security rule denials

### Server Log Monitoring
Monitor for:
- Failed authentication attempts
- Blocked requests
- Unusual traffic patterns

## Best Practices Implemented

1. **Principle of Least Privilege**: Users can only access what they need
2. **Defense in Depth**: Multiple security layers
3. **Secure by Default**: All new users are non-admin
4. **Regular Updates**: Security rules can be updated independently
5. **Monitoring**: Security events are logged and visible

## Environment-Specific Settings

### Development
- HTTPS redirect disabled for localhost
- Relaxed CSP for development tools
- Console logging enabled

### Production
- Strict security headers
- HTTPS enforced
- Minimal error information exposed

## Security Checklist

Before deploying to production:

- [ ] SSL certificate installed and valid
- [ ] Security headers configured
- [ ] Firebase Security Rules deployed
- [ ] Admin users configured with custom claims
- [ ] HTTPS redirect working
- [ ] CSP policy tested and refined
- [ ] Security scanning completed
- [ ] Error pages configured
- [ ] Monitoring setup

## Incident Response

If security issues are discovered:

1. **Immediate**: Block access if necessary
2. **Assess**: Determine scope and impact
3. **Fix**: Deploy security patches
4. **Monitor**: Watch for further issues
5. **Review**: Update security measures

## Compliance Notes

This implementation helps with:
- **GDPR**: User data protection and privacy
- **Security Standards**: Industry best practices
- **Internal Policies**: Company security requirements

For questions or issues, consult your security team or Firebase documentation.