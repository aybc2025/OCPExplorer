// OCP Explorer - Main Application Logic

// Application state
const OCPExplorer = {
    version: '1.0.0',
    initialized: false,
    currentMode: 'browse', // browse, search, analysis
    debugMode: false
};

// Initialize application
function initializeApp() {
    console.log('🏙️ OCP Explorer v' + OCPExplorer.version + ' starting...');
    
    try {
        // Check for required dependencies
        if (typeof L === 'undefined') {
            throw new Error('Leaflet library not loaded');
        }
        
        // Initialize app components
        setupEventListeners();
        initializeUI();
        
        // Mark as initialized
        OCPExplorer.initialized = true;
        
        console.log('✅ OCP Explorer initialized successfully');
        
        // Show welcome message (first-time users)
        if (localStorage.getItem('ocp_explorer_visited') !== 'true') {
            showWelcomeMessage();
            localStorage.setItem('ocp_explorer_visited', 'true');
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize OCP Explorer:', error);
        showInitializationError(error.message);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Window resize handling
    window.addEventListener('resize', handleWindowResize);
    
    // Mobile menu toggle (future feature)
    const menuButton = document.querySelector('.mobile-menu-btn');
    if (menuButton) {
        menuButton.addEventListener('click', toggleMobileMenu);
    }
    
    // Print page handling
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
}

// Initialize UI elements
function initializeUI() {
    // Add loading indicators where needed
    addLoadingIndicators();
    
    // Setup tooltips for buttons
    setupTooltips();
    
    // Initialize mobile responsiveness
    handleMobileLayout();
    
    // Add current timestamp to footer
    updateFooterTimestamp();
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // Only handle if not typing in input field
    if (e.target.tagName.toLowerCase() === 'input') return;
    
    switch(e.key.toLowerCase()) {
        case 'c':
            if (e.ctrlKey || e.metaKey) return; // Don't override copy
            centerMap();
            break;
        case 'd':
            showDowntown();
            break;
        case 'u':
            showUptown();
            break;
        case 's':
            if (!e.ctrlKey && !e.metaKey) { // Don't override save
                searchLocation();
            }
            break;
        case 'l':
            toggleLayers();
            break;
        case 'escape':
            closeAllPopups();
            break;
        case '?':
            showKeyboardShortcuts();
            break;
    }
}

// Handle window resize
function handleWindowResize() {
    if (window.map) {
        // Invalidate map size to ensure proper rendering
        setTimeout(() => {
            window.map.invalidateSize();
        }, 100);
    }
    
    // Update mobile layout
    handleMobileLayout();
}

// Mobile layout adjustments
function handleMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    const sidebar = document.querySelector('.sidebar');
    const mapContainer = document.querySelector('.map-container');
    
    if (isMobile) {
        document.body.classList.add('mobile-layout');
        
        // Adjust sidebar height on mobile
        if (sidebar) {
            sidebar.style.maxHeight = '300px';
        }
    } else {
        document.body.classList.remove('mobile-layout');
        
        // Reset sidebar height on desktop
        if (sidebar) {
            sidebar.style.maxHeight = 'none';
        }
    }
}

// Utility functions
function addLoadingIndicators() {
    // Add loading spinner to elements that need it
    const elementsNeedingLoader = [
        '.map-container',
        '.sidebar-content'
    ];
    
    elementsNeedingLoader.forEach(selector => {
        const element = document.querySelector(selector);
        if (element && !element.querySelector('.loading-indicator')) {
            const loader = document.createElement('div');
            loader.className = 'loading-indicator';
            loader.innerHTML = '<div class="spinner"></div>';
            loader.style.display = 'none';
            element.appendChild(loader);
        }
    });
}

function setupTooltips() {
    const buttons = document.querySelectorAll('.action-btn, .control-btn');
    
    buttons.forEach(button => {
        if (!button.title) {
            // Add helpful tooltips based on button content
            const text = button.textContent.trim();
            switch(text) {
                case 'Center Map':
                    button.title = 'Return to New Westminster center view (Shortcut: C)';
                    break;
                case 'Downtown':
                    button.title = 'Zoom to Downtown area (Shortcut: D)';
                    break;
                case 'Uptown':
                    button.title = 'Zoom to Uptown area (Shortcut: U)';
                    break;
                case '🗂️ Layers':
                    button.title = 'Toggle map layers (Shortcut: L)';
                    break;
                case '🔍 Search':
                    button.title = 'Search for locations (Shortcut: S)';
                    break;
            }
        }
    });
}

// Welcome message for new users
function showWelcomeMessage() {
    const welcome = document.createElement('div');
    welcome.className = 'welcome-overlay';
    welcome.innerHTML = `
        <div class="welcome-content">
            <h2>Welcome to OCP Explorer!</h2>
            <p>This interactive tool helps you explore New Westminster's Official Community Plan.</p>
            <ul>
                <li>🗺️ Click anywhere on the map to view property information</li>
                <li>🎯 Use the navigation buttons to jump to key areas</li>
                <li>⌨️ Press <strong>?</strong> to see keyboard shortcuts</li>
                <li>📱 Optimized for both desktop and mobile devices</li>
            </ul>
            <p><small>More features coming soon: AI-powered search, detailed zoning data, and policy integration.</small></p>
            <button onclick="closeWelcomeMessage()" class="action-btn">Get Started</button>
        </div>
    `;
    
    welcome.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    welcome.querySelector('.welcome-content').style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        margin: 1rem;
        text-align: center;
    `;
    
    document.body.appendChild(welcome);
}

function closeWelcomeMessage() {
    const welcome = document.querySelector('.welcome-overlay');
    if (welcome) {
        welcome.remove();
    }
}

// Show keyboard shortcuts
function showKeyboardShortcuts() {
    alert(`⌨️ Keyboard Shortcuts:

C - Center map on New Westminster
D - Show Downtown area  
U - Show Uptown area
S - Search for location
L - Toggle map layers
ESC - Close all popups
? - Show this help

More shortcuts coming soon!`);
}

// Close all popups and overlays
function closeAllPopups() {
    // Close map popups
    if (window.map) {
        window.map.closePopup();
    }
    
    // Remove temporary markers
    if (window.tempMarker && window.map) {
        window.map.removeLayer(window.tempMarker);
        window.tempMarker = null;
    }
    
    // Close any modal dialogs
    const modals = document.querySelectorAll('.modal-overlay, .welcome-overlay');
    modals.forEach(modal => modal.remove());
}

// Print handling
function handleBeforePrint() {
    document.body.classList.add('printing');
    
    // Hide interactive elements for print
    const hideForPrint = document.querySelectorAll('.map-controls, .sidebar');
    hideForPrint.forEach(el => el.style.display = 'none');
}

function handleAfterPrint() {
    document.body.classList.remove('printing');
    
    // Restore interactive elements
    const showAfterPrint = document.querySelectorAll('.map-controls, .sidebar');
    showAfterPrint.forEach(el => el.style.display = '');
}

// Error handling
function showInitializationError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'initialization-error';
    errorDiv.innerHTML = `
        <h2>⚠️ Application Error</h2>
        <p>OCP Explorer failed to initialize: ${message}</p>
        <button onclick="location.reload()">Reload Page</button>
    `;
    
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #ef4444;
        border-radius: 8px;
        padding: 2rem;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    document.body.appendChild(errorDiv);
}

// Update footer with current timestamp
function updateFooterTimestamp() {
    const footer = document.querySelector('.footer');
    if (footer) {
        const now = new Date();
        const timestamp = now.toLocaleDateString('en-CA') + ' ' + now.toLocaleTimeString('en-CA');
        footer.innerHTML += ` • Last loaded: ${timestamp}`;
    }
}

// Mobile menu toggle (placeholder for future)
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Debug functions (for development)
function enableDebugMode() {
    OCPExplorer.debugMode = true;
    console.log('🐛 Debug mode enabled');
    
    // Add debug info to page
    const debugInfo = document.createElement('div');
    debugInfo.id = 'debug-info';
    debugInfo.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 0.5rem;
        font-family: monospace;
        font-size: 0.8rem;
        border-radius: 4px;
        z-index: 9999;
    `;
    debugInfo.innerHTML = `DEBUG MODE | Screen: ${window.innerWidth}x${window.innerHeight}`;
    document.body.appendChild(debugInfo);
    
    // Update debug info on resize
    window.addEventListener('resize', () => {
        debugInfo.innerHTML = `DEBUG MODE | Screen: ${window.innerWidth}x${window.innerHeight}`;
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for global access
window.OCPExplorer = OCPExplorer;
