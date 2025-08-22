/**
 * Under Construction Mode System
 * Only allows Marc Delaney access when construction mode is enabled
 */

console.log('🚧 Under Construction system loaded');

const ADMIN_EMAIL = 'mdelaney@castlefineart.com';

/**
 * Check if under construction mode is enabled
 */
function isUnderConstructionEnabled() {
  return localStorage.getItem('underConstructionMode') === 'true';
}

/**
 * Enable under construction mode
 */
function enableUnderConstructionMode() {
  localStorage.setItem('underConstructionMode', 'true');
  console.log('🚧 Under construction mode ENABLED');
  showConstructionPage();
}

/**
 * Disable under construction mode
 */
function disableUnderConstructionMode() {
  localStorage.removeItem('underConstructionMode');
  console.log('✅ Under construction mode DISABLED');
  location.reload(); // Reload to show normal site
}

/**
 * Check if current user is Marc Delaney
 */
function isMarc(user) {
  return user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Show the under construction page
 */
function showConstructionPage() {
  // Hide all existing content
  const main = document.getElementById('main');
  const sidebar = document.getElementById('sidebar-container');
  const header = document.querySelector('header');
  
  if (main) main.style.display = 'none';
  if (sidebar) sidebar.style.display = 'none';
  if (header) header.style.display = 'none';
  
  // Create under construction overlay
  const constructionOverlay = document.createElement('div');
  constructionOverlay.id = 'under-construction-overlay';
  constructionOverlay.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #f9e7cd;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: 'DIN Light Alternate', Arial, sans-serif;
    ">
      <img src="underconstruction.png" alt="Under Construction" style="
        max-width: 80%;
        max-height: 60%;
        object-fit: contain;
        margin-bottom: 2rem;
        filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
      ">
      
      <div style="
        text-align: center;
        color: #8B4513;
        max-width: 600px;
        padding: 2rem;
      ">
        <h1 style="
          font-size: 3rem;
          margin: 0 0 1rem 0;
          font-weight: 600;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        ">🚧 Under Construction</h1>
        
        <p style="
          font-size: 1.3rem;
          margin: 0 0 2rem 0;
          line-height: 1.6;
          opacity: 0.9;
        ">
          We're currently working on some exciting new features!<br>
          The site will be back online shortly.
        </p>
        
        <div style="
          background: rgba(255,255,255,0.3);
          padding: 1rem 2rem;
          border-radius: 12px;
          border: 2px solid rgba(139,69,19,0.2);
          font-size: 0.9rem;
          color: #654321;
        ">
          📧 For urgent matters, please contact us directly via email or phone.
        </div>
      </div>
      
      <div style="
        position: absolute;
        bottom: 2rem;
        right: 2rem;
        font-size: 0.8rem;
        color: rgba(139,69,19,0.6);
      ">
        Castle Communications System
      </div>
    </div>
  `;
  
  document.body.appendChild(constructionOverlay);
}

/**
 * Initialize under construction check for ALL pages
 */
function initUnderConstructionCheck() {
  // Skip check only for the login page
  if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    return;
  }
  
  firebase.auth().onAuthStateChanged((user) => {
    if (isUnderConstructionEnabled()) {
      if (!user) {
        // Not logged in - redirect to login
        window.location.href = 'index.html';
        return;
      }
      
      if (!isMarc(user)) {
        // Logged in but not Marc - show construction page
        console.log('🚧 Construction mode active - access denied for:', user.email);
        showConstructionPage();
        return;
      }
      
      // User is Marc - show normal site with construction controls
      console.log('✅ Under construction mode active - Marc Delaney access granted');
      addConstructionControls();
    }
  });
}

/**
 * Add construction mode controls for Marc
 */
function addConstructionControls() {
  // Add floating construction control button
  const controlsDiv = document.createElement('div');
  controlsDiv.id = 'construction-controls';
  controlsDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: #ff6b6b;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 25px;
    font-size: 0.8rem;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
    cursor: pointer;
    transition: all 0.3s ease;
  `;
  
  controlsDiv.innerHTML = '🚧 CONSTRUCTION MODE ON - Click to disable';
  controlsDiv.onclick = () => {
    if (confirm('Disable under construction mode? This will allow all users to access the site.')) {
      disableUnderConstructionMode();
    }
  };
  
  controlsDiv.addEventListener('mouseenter', () => {
    controlsDiv.style.background = '#ff5252';
    controlsDiv.style.transform = 'scale(1.05)';
  });
  
  controlsDiv.addEventListener('mouseleave', () => {
    controlsDiv.style.background = '#ff6b6b';
    controlsDiv.style.transform = 'scale(1)';
  });
  
  document.body.appendChild(controlsDiv);
}

/**
 * Add construction mode toggle to homepage for Marc
 */
function addConstructionToggleToHomepage() {
  firebase.auth().onAuthStateChanged((user) => {
    if (isMarc(user)) {
      // Find the action buttons section on the main page
      const actionButtons = document.querySelector('.action-buttons');
      if (actionButtons) {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'pill-button construction-toggle';
        toggleButton.style.cssText = `
          background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
          color: white;
          border: none;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 25px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1rem;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
          margin: 0.5rem;
        `;
        
        const isEnabled = isUnderConstructionEnabled();
        toggleButton.innerHTML = `
          <span>🚧</span>
          ${isEnabled ? 'Disable Construction Mode' : 'Enable Construction Mode'}
        `;
        
        toggleButton.onclick = () => {
          if (isUnderConstructionEnabled()) {
            if (confirm('Disable under construction mode?\n\nThis will allow ALL users to access the entire site normally.')) {
              disableUnderConstructionMode();
            }
          } else {
            if (confirm('Enable under construction mode?\n\nThis will block ALL users (except you) from accessing ANY part of the site.\n\nThey will see an under construction page instead.')) {
              enableUnderConstructionMode();
            }
          }
        };
        
        toggleButton.addEventListener('mouseenter', () => {
          toggleButton.style.transform = 'translateY(-3px)';
          toggleButton.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
          toggleButton.style.background = 'linear-gradient(135deg, #ff5252 0%, #e53935 100%)';
        });
        
        toggleButton.addEventListener('mouseleave', () => {
          toggleButton.style.transform = 'translateY(0)';
          toggleButton.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)';
          toggleButton.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)';
        });
        
        actionButtons.appendChild(toggleButton);
      }
    }
  });
}

// Initialize the system
document.addEventListener('DOMContentLoaded', () => {
  // Always run construction check first
  initUnderConstructionCheck();
  
  // Add toggle button to homepage if it's the main page
  if (document.querySelector('.modern-main')) {
    addConstructionToggleToHomepage();
  }
});

// Export for global access
window.UnderConstruction = {
  isEnabled: isUnderConstructionEnabled,
  enable: enableUnderConstructionMode,
  disable: disableUnderConstructionMode,
  isMarc,
  ADMIN_EMAIL
};