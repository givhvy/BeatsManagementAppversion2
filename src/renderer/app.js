// ============================
// APP INITIALIZATION & ROUTING
// ============================

// Global references
const { ipcRenderer } = require('electron');
const isElectron = typeof ipcRenderer !== 'undefined';

// Current page state
let currentPage = null;
let loadedScripts = new Set();
let loadedStyles = new Set();

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Beats Management Studio - Modular Architecture');
  
  // Setup navigation
  setupNavigation();
  
  // Load initial page (Beats)
  loadPage('beats');
});

// Setup navigation event listeners
function setupNavigation() {
  document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = btn.dataset.section;
      loadPage(pageName);
      
      // Update active state
      document.querySelectorAll('[data-section]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// Load a page dynamically
async function loadPage(pageName) {
  console.log(`📄 Loading page: ${pageName}`);
  
  try {
    // Hide all sections first
    document.querySelectorAll('.app-section').forEach(section => {
      section.style.display = 'none';
    });
    
    const container = document.getElementById('app-container');
    if (!container) {
      console.error('App container not found!');
      return;
    }
    
    // Load HTML
    const htmlPath = `pages/${pageName}/${pageName}.html`;
    const response = await fetch(htmlPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${htmlPath}`);
    }
    const html = await response.text();
    
    // Create section wrapper
    const section = document.createElement('div');
    section.className = 'app-section';
    section.id = `${pageName}-section`;
    section.innerHTML = html;
    
    // Clear container and add new section
    container.innerHTML = '';
    container.appendChild(section);
    
    // Load CSS (only once)
    await loadCSS(`pages/${pageName}/${pageName}.css`, pageName);
    
    // Load and execute JS
    await loadScript(`pages/${pageName}/${pageName}.js`, pageName);
    
    // Initialize page
    const initFunctionName = `init${capitalize(pageName)}Page`;
    if (typeof window[initFunctionName] === 'function') {
      console.log(`✅ Initializing ${pageName} page`);
      await window[initFunctionName]();
    } else {
      console.warn(`⚠️  Init function not found: ${initFunctionName}`);
    }
    
    currentPage = pageName;
    console.log(`✅ Page loaded: ${pageName}`);
    
  } catch (error) {
    console.error(`❌ Error loading page ${pageName}:`, error);
    showError(`Failed to load ${pageName} page: ${error.message}`);
  }
}

// Load CSS file
async function loadCSS(path, id) {
  if (loadedStyles.has(id)) {
    console.log(`♻️  CSS already loaded: ${id}`);
    return;
  }
  
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = path;
    link.id = `style-${id}`;
    link.onload = () => {
      loadedStyles.add(id);
      console.log(`📦 CSS loaded: ${path}`);
      resolve();
    };
    link.onerror = () => reject(new Error(`Failed to load CSS: ${path}`));
    document.head.appendChild(link);
  });
}

// Load JavaScript file
async function loadScript(path, id) {
  if (loadedScripts.has(id)) {
    console.log(`♻️  Script already loaded: ${id}`);
    return;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = path;
    script.id = `script-${id}`;
    script.onload = () => {
      loadedScripts.add(id);
      console.log(`📦 Script loaded: ${path}`);
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${path}`));
    document.body.appendChild(script);
  });
}

// Utility: Capitalize first letter
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Show error message
function showError(message) {
  const container = document.getElementById('app-container');
  if (container) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #ef4444;">
        <h2>Error</h2>
        <p>${message}</p>
        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Reload App
        </button>
      </div>
    `;
  }
}

// Export for use in other modules
window.loadPage = loadPage;
window.isElectron = isElectron;
window.ipcRenderer = ipcRenderer;
