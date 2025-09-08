// Main application logic and event handling

// Application state
const appState = {
    isLoaded: false,
    currentView: 'default',
    searchHistory: []
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Initializing OCP Explorer application...');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI components
    initializeUI();
    
    // Handle mobile layout
    handleMobileLayout();
    
    // Mark app as loaded
    appState.isLoaded = true;
    
    console.log('Application initialized successfully');
}

function setupEventListeners() {
    // Window resize handler
    window.addEventListener('resize', handleWindowResize);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Handle mobile orientation changes
    window.addEventListener('orientationchange', function() {
        setTimeout(handleMobileLayout, 100);
    });
}

function initializeUI() {
    // Add loading indicators where needed
    addLoadingIndicators();
    
    // Set up responsive behaviors
    handleMobileLayout();
    
    // Initialize any interactive elements
    initializeInteractiveElements();
}

function initializeInteractiveElements() {
    // Add hover effects to buttons
    const buttons = document.querySelectorAll('.control-btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(event) {
    // Only handle shortcuts when not typing in inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(event.key) {
        case 'l':
        case 'L':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                toggleLayers();
            }
            break;
        case 's':
        case 'S':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                searchLocation();
            }
            break;
        case 'Escape':
            // Clear any active selections or close modals
            clearMapSelections();
            break;
        case '?':
            showKeyboardShortcuts();
            break;
    }
}

function clearMapSelections() {
    if (window.mapFunctions && window.mapFunctions.clearMarkers) {
        window.mapFunctions.clearMarkers();
    }
    
    // Reset property info panel
    const propertyInfo = document.getElementById('property-info');
    if (propertyInfo) {
        propertyInfo.innerHTML = '<p class="placeholder-text">Click on the map to view property details</p>';
    }
}

function showKeyboardShortcuts() {
    const shortcuts = `
Keyboard Shortcuts:
• Ctrl/Cmd + L: Toggle Layers
• Ctrl/Cmd + S: Search Location
• Escape: Clear Selection
• ?: Show this help

Mouse Controls:
• Click: Select location
• Scroll: Zoom in/out
• Drag: Pan map
    `;
    
    alert(shortcuts.trim());
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
            loader.innerHTML = '<div class="loading-spinner"></div><p>Loading...</p>';
            loader.style.display = 'none'; // Hidden by default
            element.appendChild(loader);
        }
    });
}

function showLoading(elementSelector) {
    const element = document.querySelector(elementSelector);
    if (element) {
        const loader = element.querySelector('.loading-indicator');
        if (loader) {
            loader.style.display = 'block';
        }
    }
}

function hideLoading(elementSelector) {
    const element = document.querySelector(elementSelector);
    if (element) {
        const loader = element.querySelector('.loading-indicator');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Error handling
function handleError(error, context = 'Application') {
    console.error(`${context} Error:`, error);
    
    // Show user-friendly error message
    const errorMessage = `
        <div class="error-message">
            <h3>⚠️ Something went wrong</h3>
            <p>We encountered an issue while loading the application. Please try refreshing the page.</p>
            <small>Error context: ${context}</small>
        </div>
    `;
    
    // Display error in sidebar if available
    const propertyInfo = document.getElementById('property-info');
    if (propertyInfo) {
        propertyInfo.innerHTML = errorMessage;
    }
}

// Performance monitoring
function trackPerformance() {
    if ('performance' in window) {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        console.log(`Application load time: ${loadTime}ms`);
    }
}

// Initialize performance tracking
window.addEventListener('load', trackPerformance);

// Export utilities for use in other scripts
window.appUtils = {
    showLoading,
    hideLoading,
    handleError,
    clearMapSelections,
    handleMobileLayout
};
