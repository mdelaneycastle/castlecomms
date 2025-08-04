/**
 * OneDrive Integration Utilities for Castle Comms Communications System
 * 
 * This file provides utilities for integrating with OneDrive Business
 * using Microsoft Graph API for document sharing and access.
 * 
 * Prerequisites:
 * 1. Azure AD App Registration with appropriate permissions
 * 2. Microsoft Graph API access
 * 3. OneDrive Business licenses
 */

class OneDriveIntegration {
  constructor() {
    this.graphEndpoint = 'https://graph.microsoft.com/v1.0';
    this.accessToken = null;
    this.isInitialized = false;
  }

  /**
   * Initialize OneDrive integration
   * This would typically involve OAuth flow with Azure AD
   */
  async initialize() {
    try {
      // In a production environment, you would implement proper OAuth flow here
      // For now, this is a placeholder for the authentication setup
      console.log('OneDrive integration initialized');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize OneDrive integration:', error);
      return false;
    }
  }

  /**
   * Convert OneDrive share link to direct download URL
   * @param {string} shareUrl - OneDrive share URL
   * @returns {string} Direct download URL
   */
  convertToDirectDownloadUrl(shareUrl) {
    try {
      // Convert OneDrive share link to direct download
      // This handles the common OneDrive share URL formats
      if (shareUrl.includes('1drv.ms')) {
        // Short URL format - would need to be expanded first
        return shareUrl + '&download=1';
      } else if (shareUrl.includes('sharepoint.com') || shareUrl.includes('onedrive.live.com')) {
        // Standard OneDrive/SharePoint URLs
        const url = new URL(shareUrl);
        url.searchParams.set('download', '1');
        return url.toString();
      }
      
      return shareUrl;
    } catch (error) {
      console.error('Error converting OneDrive URL:', error);
      return shareUrl;
    }
  }

  /**
   * Validate OneDrive URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid OneDrive URL
   */
  isValidOneDriveUrl(url) {
    try {
      const urlObj = new URL(url);
      const validDomains = [
        '1drv.ms',
        'onedrive.live.com',
        'sharepoint.com'
      ];
      
      return validDomains.some(domain => urlObj.hostname.includes(domain));
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract file name from OneDrive URL
   * @param {string} url - OneDrive URL
   * @returns {string} Extracted filename or default
   */
  extractFileName(url) {
    try {
      const urlObj = new URL(url);
      
      // Try to extract filename from path
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      
      if (lastPart && lastPart.includes('.')) {
        return decodeURIComponent(lastPart);
      }
      
      // Try to extract from search params
      const resId = urlObj.searchParams.get('resid');
      if (resId) {
        // ResId format often contains filename
        const parts = resId.split('!');
        if (parts.length > 1) {
          return parts[parts.length - 1];
        }
      }
      
      return 'OneDrive Document';
    } catch (error) {
      return 'OneDrive Document';
    }
  }

  /**
   * Get file metadata from OneDrive (requires authentication)
   * @param {string} fileId - OneDrive file ID
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(fileId) {
    if (!this.isInitialized || !this.accessToken) {
      throw new Error('OneDrive integration not initialized');
    }

    try {
      const response = await fetch(`${this.graphEndpoint}/me/drive/items/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching file metadata:', error);
      throw error;
    }
  }

  /**
   * Create a sharing link for a file (requires authentication)
   * @param {string} fileId - OneDrive file ID
   * @param {string} type - 'view' or 'edit'
   * @returns {Promise<string>} Sharing URL
   */
  async createSharingLink(fileId, type = 'view') {
    if (!this.isInitialized || !this.accessToken) {
      throw new Error('OneDrive integration not initialized');
    }

    try {
      const response = await fetch(`${this.graphEndpoint}/me/drive/items/${fileId}/createLink`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: type,
          scope: 'organization'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.link.webUrl;
    } catch (error) {
      console.error('Error creating sharing link:', error);
      throw error;
    }
  }

  /**
   * Search for files in OneDrive (requires authentication)
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of file objects
   */
  async searchFiles(query) {
    if (!this.isInitialized || !this.accessToken) {
      throw new Error('OneDrive integration not initialized');
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(`${this.graphEndpoint}/me/drive/search(q='${encodedQuery}')`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.value || [];
    } catch (error) {
      console.error('Error searching files:', error);
      throw error;
    }
  }

  /**
   * Get file icon based on file extension
   * @param {string} filename - File name
   * @returns {string} Icon emoji
   */
  getFileIcon(filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const iconMap = {
      // Documents
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'txt': '📄',
      'rtf': '📄',
      
      // Spreadsheets
      'xls': '📊',
      'xlsx': '📊',
      'csv': '📊',
      
      // Presentations
      'ppt': '📽️',
      'pptx': '📽️',
      
      // Images
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'bmp': '🖼️',
      'svg': '🖼️',
      
      // Archives
      'zip': '🗜️',
      'rar': '🗜️',
      '7z': '🗜️',
      
      // Other
      'mp4': '🎥',
      'avi': '🎥',
      'mp3': '🎵',
      'wav': '🎵'
    };
    
    return iconMap[extension] || '📄';
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Global instance
window.oneDriveIntegration = new OneDriveIntegration();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.oneDriveIntegration.initialize();
});

/**
 * Usage Examples:
 * 
 * // Check if URL is valid OneDrive URL
 * const isValid = window.oneDriveIntegration.isValidOneDriveUrl(url);
 * 
 * // Convert to direct download URL
 * const downloadUrl = window.oneDriveIntegration.convertToDirectDownloadUrl(shareUrl);
 * 
 * // Extract filename
 * const filename = window.oneDriveIntegration.extractFileName(url);
 * 
 * // Get file icon
 * const icon = window.oneDriveIntegration.getFileIcon(filename);
 * 
 * // For authenticated operations (requires proper OAuth setup):
 * // const metadata = await window.oneDriveIntegration.getFileMetadata(fileId);
 * // const shareUrl = await window.oneDriveIntegration.createSharingLink(fileId);
 * // const files = await window.oneDriveIntegration.searchFiles('quarterly report');
 */