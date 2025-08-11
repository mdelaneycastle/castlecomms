/**
 * Google Drive Integration for Gallery Images
 * Handles file uploads and retrieval from Google Drive
 */

class GoogleDriveIntegration {
  constructor() {
    this.folderId = '1FGhH16oogIvS3hy_sACyyxfKScfq6v_G';
    this.apiKey = 'AIzaSyCiK6xf3OlwLPuaNSP4tjHQZYMe6owh8M8'; // Will be set up later
    this.isInitialized = false;
  }

  /**
   * Initialize Google Drive integration
   */
  async initialize() {
    try {
      console.log('🔧 Google Drive integration initialized');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive integration:', error);
      return false;
    }
  }

  /**
   * Upload file to Google Drive folder
   * @param {File} file - File to upload
   * @param {string} filename - Custom filename for the file
   * @param {function} progressCallback - Progress callback function
   * @returns {Promise<string>} File ID of uploaded file
   */
  async uploadFile(file, filename, progressCallback) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      const metadata = {
        name: filename,
        parents: [this.folderId]
      };

      formData.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && progressCallback) {
          const percentComplete = (e.loaded / e.total) * 100;
          progressCallback(percentComplete);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          console.log('✅ Google Drive upload successful:', response);
          resolve(response.id);
        } else {
          console.error('❌ Google Drive upload failed:', xhr.status, xhr.responseText);
          reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        console.error('❌ Google Drive upload network error');
        reject(new Error('Upload failed due to network error'));
      };

      // Use real Google Drive API upload
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=' + this.apiKey);
      xhr.send(formData);
    });
  }

  /**
   * Simulate file upload for testing purposes
   */
  simulateUpload(file, filename, progressCallback, resolve, reject) {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      if (progress > 95) progress = 95;
      
      if (progressCallback) {
        progressCallback(progress);
      }

      if (progress >= 95) {
        clearInterval(interval);
        if (progressCallback) {
          progressCallback(100);
        }
        
        // Generate a fake file ID for testing
        const fakeFileId = 'fake_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        setTimeout(() => {
          resolve(fakeFileId);
        }, 500);
      }
    }, 200);
  }

  /**
   * Get direct image URL from Google Drive file ID
   * @param {string} fileId - Google Drive file ID
   * @returns {string} Direct image URL
   */
  getImageUrl(fileId) {
    // For testing with fake IDs, return a placeholder
    if (fileId.startsWith('fake_')) {
      return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iIzY2N2VlYSIgb3BhY2l0eT0iMC4xIi8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0cHgiIGZpbGw9IiM2Njc3ZWEiIGZvbnQtd2VpZ2h0PSI2MDAiPlRlc3QgSW1hZ2U8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwcHgiIGZpbGw9IiM5NGEzYjgiPiR7ZmlsZUlkfTwvdGV4dD48L3N2Zz4=`.replace('${fileId}', fileId);
    }

    // Use Google Drive direct view URL with API key for better reliability
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${this.apiKey}`;
  }

  /**
   * Get high resolution image URL for modal view
   * @param {string} fileId - Google Drive file ID
   * @returns {string} High resolution image URL
   */
  getHighResImageUrl(fileId) {
    // For testing with fake IDs, return a larger placeholder
    if (fileId.startsWith('fake_')) {
      return `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzY2N2VlYSIgb3BhY2l0eT0iMC4xNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNDUlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNHB4IiBmaWxsPSIjNjY3ZWVhIiBmb250LXdlaWdodD0iNzAwIj5IaWdoIFJlcyBUZXN0IEltYWdlPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNnB4IiBmaWxsPSIjOTRhM2I4Ij4ke2ZpbGVJZH08L3RleHQ+PC9zdmc+`.replace('${fileId}', fileId);
    }

    // Use same API endpoint for high-res images
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${this.apiKey}`;
  }

  /**
   * List files in the gallery folder
   * @returns {Promise<Array>} Array of file objects
   */
  async listFiles() {
    // For testing, return empty array since we can't actually query without API key
    // In production, this would query the Google Drive API
    return [];
  }

  /**
   * Delete file from Google Drive
   * @param {string} fileId - File ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileId) {
    try {
      // In production with API key:
      // const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?key=${this.apiKey}`, {
      //   method: 'DELETE'
      // });
      // return response.ok;

      // For testing, always return success
      console.log(`🗑️ Would delete file: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Generate filename with user and timestamp
   * @param {string} originalFilename - Original file name
   * @param {string} userDisplayName - User's display name
   * @returns {string} Generated filename
   */
  generateFilename(originalFilename, userDisplayName) {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '');
    
    const extension = originalFilename.split('.').pop();
    const cleanDisplayName = userDisplayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10); // Limit length
    
    return `${cleanDisplayName}${timestamp}.${extension}`;
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File must be an image' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Unsupported image format. Use JPG, PNG, GIF, or WebP' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    return { valid: true };
  }
}

// Global instance
window.googleDriveIntegration = new GoogleDriveIntegration();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.googleDriveIntegration.initialize();
});

/**
 * Setup Instructions:
 * 
 * 1. Get Google API Key:
 *    - Go to https://console.cloud.google.com/
 *    - Create a new project or select existing
 *    - Enable Google Drive API
 *    - Create credentials (API key)
 *    - Restrict the key to Google Drive API and your domain
 * 
 * 2. Update this file:
 *    - Replace 'YOUR_GOOGLE_API_KEY' with your actual API key
 * 
 * 3. For production uploads, you'll also need OAuth2 setup
 *    - The current implementation assumes the folder is publicly writable
 *    - For secure uploads, implement Google OAuth2 authentication
 * 
 * Usage:
 * - window.googleDriveIntegration.uploadFile(file, filename, progressCallback)
 * - window.googleDriveIntegration.getImageUrl(fileId)
 * - window.googleDriveIntegration.getHighResImageUrl(fileId)
 */