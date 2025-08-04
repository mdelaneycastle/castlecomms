/**
 * PowerBI Integration Utilities for Castle Comms Communications System
 * 
 * This file provides utilities for integrating PowerBI reports and dashboards
 * into communications, supporting both embedded content and direct links.
 * 
 * Prerequisites:
 * 1. PowerBI Pro or Premium licensing
 * 2. Azure AD App Registration for PowerBI API access
 * 3. PowerBI workspace access
 */

class PowerBIIntegration {
  constructor() {
    this.powerBIEndpoint = 'https://api.powerbi.com/v1.0/myorg';
    this.embedEndpoint = 'https://app.powerbi.com/embed';
    this.accessToken = null;
    this.isInitialized = false;
  }

  /**
   * Initialize PowerBI integration
   */
  async initialize() {
    try {
      // In a production environment, you would implement proper OAuth flow here
      // For now, this is a placeholder for the authentication setup
      console.log('PowerBI integration initialized');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize PowerBI integration:', error);
      return false;
    }
  }

  /**
   * Validate PowerBI URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid PowerBI URL
   */
  isValidPowerBIUrl(url) {
    try {
      const urlObj = new URL(url);
      const validDomains = [
        'app.powerbi.com',
        'powerbi.microsoft.com',
        'powerbi.com'
      ];
      
      return validDomains.some(domain => urlObj.hostname.includes(domain));
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract PowerBI content type from URL
   * @param {string} url - PowerBI URL
   * @returns {string} Content type: 'report', 'dashboard', or 'unknown'
   */
  getContentType(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      
      if (path.includes('/reports/')) {
        return 'report';
      } else if (path.includes('/dashboards/')) {
        return 'dashboard';
      } else if (path.includes('/groups/') && path.includes('/reports/')) {
        return 'report';
      } else if (path.includes('/groups/') && path.includes('/dashboards/')) {
        return 'dashboard';
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Convert PowerBI share URL to embed URL
   * @param {string} shareUrl - PowerBI share URL
   * @returns {string} Embed URL for iframe
   */
  convertToEmbedUrl(shareUrl) {
    try {
      const urlObj = new URL(shareUrl);
      
      // Extract necessary parameters
      const pathParts = urlObj.pathname.split('/');
      const reportIndex = pathParts.findIndex(part => part === 'reports');
      const dashboardIndex = pathParts.findIndex(part => part === 'dashboards');
      
      if (reportIndex !== -1 && reportIndex + 1 < pathParts.length) {
        // Report URL
        const reportId = pathParts[reportIndex + 1];
        const groupIndex = pathParts.findIndex(part => part === 'groups');
        
        if (groupIndex !== -1 && groupIndex + 1 < pathParts.length) {
          // Workspace report
          const groupId = pathParts[groupIndex + 1];
          return `${this.embedEndpoint}?reportId=${reportId}&groupId=${groupId}`;
        } else {
          // My workspace report
          return `${this.embedEndpoint}?reportId=${reportId}`;
        }
      } else if (dashboardIndex !== -1 && dashboardIndex + 1 < pathParts.length) {
        // Dashboard URL
        const dashboardId = pathParts[dashboardIndex + 1];
        const groupIndex = pathParts.findIndex(part => part === 'groups');
        
        if (groupIndex !== -1 && groupIndex + 1 < pathParts.length) {
          // Workspace dashboard
          const groupId = pathParts[groupIndex + 1];
          return `${this.embedEndpoint}?dashboardId=${dashboardId}&groupId=${groupId}`;
        } else {
          // My workspace dashboard
          return `${this.embedEndpoint}?dashboardId=${dashboardId}`;
        }
      }
      
      return shareUrl; // Return original if can't convert
    } catch (error) {
      console.error('Error converting PowerBI URL:', error);
      return shareUrl;
    }
  }

  /**
   * Create responsive embed configuration
   * @param {string} embedUrl - PowerBI embed URL
   * @param {Object} options - Embed options
   * @returns {Object} Embed configuration
   */
  createEmbedConfig(embedUrl, options = {}) {
    const defaultOptions = {
      type: 'report',
      tokenType: 1, // AAD token
      accessToken: this.accessToken,
      embedUrl: embedUrl,
      settings: {
        panes: {
          filters: {
            expanded: false,
            visible: options.showFilters !== false
          },
          pageNavigation: {
            visible: options.showNavigation !== false
          }
        },
        background: 'transparent',
        layoutType: 1 // Custom layout
      },
      permissions: 1 // All permissions
    };

    return { ...defaultOptions, ...options };
  }

  /**
   * Embed PowerBI content into a container
   * @param {string} containerId - HTML element ID
   * @param {Object} config - Embed configuration
   */
  async embedContent(containerId, config) {
    try {
      // This would use the PowerBI JavaScript SDK
      // For now, we'll create an iframe as fallback
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Container ${containerId} not found`);
      }

      // Create iframe for embedding
      const iframe = document.createElement('iframe');
      iframe.src = config.embedUrl;
      iframe.width = '100%';
      iframe.height = config.height || '400px';
      iframe.frameBorder = '0';
      iframe.allowFullscreen = true;
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';

      container.innerHTML = '';
      container.appendChild(iframe);

      return iframe;
    } catch (error) {
      console.error('Error embedding PowerBI content:', error);
      throw error;
    }
  }

  /**
   * Get PowerBI workspaces (requires authentication)
   * @returns {Promise<Array>} Array of workspace objects
   */
  async getWorkspaces() {
    if (!this.isInitialized || !this.accessToken) {
      throw new Error('PowerBI integration not initialized');
    }

    try {
      const response = await fetch(`${this.powerBIEndpoint}/groups`, {
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
      console.error('Error fetching workspaces:', error);
      throw error;
    }
  }

  /**
   * Get reports in a workspace (requires authentication)
   * @param {string} workspaceId - Workspace ID (null for My Workspace)
   * @returns {Promise<Array>} Array of report objects
   */
  async getReports(workspaceId = null) {
    if (!this.isInitialized || !this.accessToken) {
      throw new Error('PowerBI integration not initialized');
    }

    try {
      const endpoint = workspaceId 
        ? `${this.powerBIEndpoint}/groups/${workspaceId}/reports`
        : `${this.powerBIEndpoint}/reports`;

      const response = await fetch(endpoint, {
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
      console.error('Error fetching reports:', error);
      throw error;
    }
  }

  /**
   * Get dashboards in a workspace (requires authentication)
   * @param {string} workspaceId - Workspace ID (null for My Workspace)
   * @returns {Promise<Array>} Array of dashboard objects
   */
  async getDashboards(workspaceId = null) {
    if (!this.isInitialized || !this.accessToken) {
      throw new Error('PowerBI integration not initialized');
    }

    try {
      const endpoint = workspaceId 
        ? `${this.powerBIEndpoint}/groups/${workspaceId}/dashboards`
        : `${this.powerBIEndpoint}/dashboards`;

      const response = await fetch(endpoint, {
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
      console.error('Error fetching dashboards:', error);
      throw error;
    }
  }

  /**
   * Create PowerBI link button with proper styling
   * @param {string} url - PowerBI URL
   * @param {string} title - Button title
   * @param {string} type - Content type ('report' or 'dashboard')
   * @returns {HTMLElement} Button element
   */
  createLinkButton(url, title, type = 'report') {
    const button = document.createElement('a');
    button.href = url;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.className = 'powerbi-link-button';
    
    const icon = type === 'dashboard' ? '📊' : '📈';
    button.innerHTML = `
      <span class="powerbi-icon">${icon}</span>
      <span class="powerbi-title">${title}</span>
      <span class="powerbi-external">↗</span>
    `;
    
    // Add styles
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #f7931e 0%, #fed100 100%);
      color: #333;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      border: 1px solid #e1e5e9;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
    
    return button;
  }

  /**
   * Extract title from PowerBI URL (fallback method)
   * @param {string} url - PowerBI URL
   * @returns {string} Extracted or default title
   */
  extractTitle(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      
      // Look for report or dashboard name in URL
      const reportIndex = pathParts.findIndex(part => part === 'reports');
      const dashboardIndex = pathParts.findIndex(part => part === 'dashboards');
      
      if (reportIndex !== -1) {
        return 'PowerBI Report';
      } else if (dashboardIndex !== -1) {
        return 'PowerBI Dashboard';
      }
      
      return 'PowerBI Content';
    } catch (error) {
      return 'PowerBI Content';
    }
  }

  /**
   * Check if PowerBI content can be embedded
   * @param {string} url - PowerBI URL
   * @returns {boolean} True if embeddable
   */
  canEmbed(url) {
    try {
      const urlObj = new URL(url);
      
      // Check if it's an app.powerbi.com URL with proper structure
      if (!urlObj.hostname.includes('app.powerbi.com')) {
        return false;
      }
      
      // Check if it contains report or dashboard paths
      const path = urlObj.pathname.toLowerCase();
      return path.includes('/reports/') || path.includes('/dashboards/');
    } catch (error) {
      return false;
    }
  }
}

// Global instance
window.powerBIIntegration = new PowerBIIntegration();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.powerBIIntegration.initialize();
});

/**
 * Usage Examples:
 * 
 * // Check if URL is valid PowerBI URL
 * const isValid = window.powerBIIntegration.isValidPowerBIUrl(url);
 * 
 * // Get content type
 * const type = window.powerBIIntegration.getContentType(url);
 * 
 * // Convert to embed URL
 * const embedUrl = window.powerBIIntegration.convertToEmbedUrl(shareUrl);
 * 
 * // Create link button
 * const button = window.powerBIIntegration.createLinkButton(url, 'Sales Report', 'report');
 * document.getElementById('container').appendChild(button);
 * 
 * // Embed content (requires proper authentication)
 * const config = window.powerBIIntegration.createEmbedConfig(embedUrl);
 * await window.powerBIIntegration.embedContent('powerbi-container', config);
 * 
 * // For authenticated operations (requires proper OAuth setup):
 * // const workspaces = await window.powerBIIntegration.getWorkspaces();
 * // const reports = await window.powerBIIntegration.getReports(workspaceId);
 * // const dashboards = await window.powerBIIntegration.getDashboards(workspaceId);
 */