// Enhanced Map functionality with AI integration and data layers
// Updated version of map.js with smart search and layer management

let map;
let currentMarkers = [];
let cityBoundaryLayer;
let dataLayers = {}; // Store different data layers
let currentSearchResults = [];

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
});

function initializeMap() {
    // New Westminster center coordinates
    const centerLat = 49.2057;
    const centerLng = -122.9110;
    const defaultZoom = 13;
    
    // Initialize map
    map = L.map('map', {
        center: [centerLat, centerLng],
        zoom: defaultZoom,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true
    });
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 10
    }).addTo(map);
    
    // Set up map event listeners
    setupMapEvents();
    
    // Load real city boundary from GeoJSON
    loadCityBoundary();
    
    // Initialize data layers when OCP data is ready
    window.addEventListener('ocpDataLoaded', initializeDataLayers);
    
    // Make map globally accessible
    window.map = map;
    
    console.log('Map initialized successfully');
}

function setupMapEvents() {
    // Handle map clicks - prioritize location info over boundary popup
    map.on('click', function(e) {
        // Prevent boundary layer popup from interfering
        e.originalEvent.stopPropagation();
        handleMapClick(e);
    });
    
    // Handle zoom events
    map.on('zoomend', function() {
        updateMapScale();
    });
    
    // Handle move events
    map.on('moveend', function() {
        updateMapInfo();
    });
}

// Enhanced map click handler with real data
async function handleMapClick(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    
    console.log('Map clicked at:', lat, lng);
    
    // Clear previous markers
    clearMarkers();
    
    // Add marker at clicked location
    const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<strong>Selected Location</strong><br>Coordinates: ${lat}, ${lng}`)
        .openPopup();
    
    currentMarkers.push(marker);
    
    // Always try to get location information from data handler
    if (window.ocpDataHandler?.isLoaded) {
        try {
            const locationInfo = await window.ocpDataHandler.getLocationInfo(parseFloat(lat), parseFloat(lng));
            updatePropertyInfoPanel(locationInfo, lat, lng);
        } catch (error) {
            console.error('Error getting location info:', error);
            updatePropertyInfoPanel(null, lat, lng, error.message);
        }
    } else {
        updatePropertyInfoPanel(null, lat, lng, 'Data still loading...');
    }
}

// Enhanced property info panel with real OCP data
function updatePropertyInfoPanel(locationInfo, lat, lng, errorMessage = null) {
    const propertyInfo = document.getElementById('property-info');
    if (!propertyInfo) return;
    
    if (errorMessage) {
        propertyInfo.innerHTML = `
            <div class="property-details">
                <h3>⚠️ Location Information</h3>
                <p><strong>Coordinates:</strong><br>
                <span style="font-family: monospace;">${lat}, ${lng}</span></p>
                <p><strong>Status:</strong> ${errorMessage}</p>
            </div>
        `;
        return;
    }
    
    if (!locationInfo) {
        propertyInfo.innerHTML = `
            <div class="property-details">
                <h3>📍 Location Analysis</h3>
                <p><strong>Coordinates:</strong><br>
                <span style="font-family: monospace;">${lat}, ${lng}</span></p>
                <p><strong>Status:</strong> No data available</p>
            </div>
        `;
        return;
    }
    
    // Build comprehensive location information
    const boundaryStatus = locationInfo.withinBoundary 
        ? '<span style="color: #22c55e;">✓ Within New Westminster</span>'
        : '<span style="color: #ef4444;">✗ Outside city limits</span>';
    
    let landUseSection = '';
    if (locationInfo.landUse) {
        const allowedUses = locationInfo.landUse.principalUses || locationInfo.landUse.allowedUses || [];
        const usesHtml = allowedUses.length > 0 ? 
            `<div class="allowed-uses">
                <h5>Allowed Uses</h5>
                <ul>${allowedUses.map(use => `<li>${use}</li>`).join('')}</ul>
            </div>` : '';
            
        landUseSection = `
            <div class="info-section">
                <h4>Land Use Designation</h4>
                <p><strong>${locationInfo.landUse.name} (${locationInfo.landUse.code})</strong></p>
                <p style="font-size: 0.9em; color: #6b7280;">${locationInfo.landUse.description}</p>
                <p><strong>Density:</strong> ${locationInfo.landUse.maxDensity || 'Low density residential'}</p>
                ${usesHtml}
            </div>
        `;
    }
    
    let zoningSection = '';
    if (locationInfo.zoning) {
        zoningSection = `
            <div class="info-section">
                <h4>Zoning Information</h4>
                <p><strong>${locationInfo.zoning.name}</strong></p>
                ${locationInfo.zoning.maxHeight ? `<p><strong>Height Limit:</strong> ${locationInfo.zoning.maxHeight}</p>` : ''}
                ${locationInfo.zoning.maxFAR ? `<p><strong>Max FAR:</strong> ${locationInfo.zoning.maxFAR}</p>` : ''}
                ${locationInfo.zoning.lotCoverage ? `<p><strong>Lot Coverage:</strong> ${locationInfo.zoning.lotCoverage}</p>` : ''}
            </div>
        `;
    }
    
    let policiesSection = '';
    if (locationInfo.policies && locationInfo.policies.length > 0) {
        policiesSection = `
            <div class="info-section">
                <h4>Relevant Policies</h4>
                ${locationInfo.policies.map(policy => 
                    `<p><strong>${policy.id}:</strong> ${policy.title}</p>`
                ).join('')}
            </div>
        `;
    }
    
    // Show appropriate message for outside boundary
    const outsideBoundaryMessage = !locationInfo.withinBoundary ? `
        <div class="info-section" style="background: #fef3c7; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <p style="margin: 0; color: #92400e;"><strong>Note:</strong> This location is outside New Westminster city limits. No local zoning or land use information available.</p>
        </div>
    ` : '';
    
    // Additional actions section
    const actionsSection = `
        <div class="info-section">
            <div class="action-buttons" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
                <button onclick="searchNearbyAmenities(${lat}, ${lng})" style="flex: 1; min-width: 120px; padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">🔍 Search Nearby</button>
                <button onclick="getMoreLocationDetails(${lat}, ${lng})" style="flex: 1; min-width: 120px; padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em;">📋 More Details</button>
            </div>
        </div>
    `;
    
    const dataSource = locationInfo.withinBoundary ? 
        '<p style="font-size: 0.8em; color: #6b7280; margin-top: 15px;"><em>Data from New Westminster Official Community Plan (2017). For development applications, verify with current zoning bylaws.</em></p>' : '';
    
    propertyInfo.innerHTML = `
        <div class="property-details">
            <h3>📍 Location Analysis</h3>
            <p><strong>Coordinates:</strong><br>
            <span style="font-family: monospace;">${lat}, ${lng}</span></p>
            <p><strong>Boundary Status:</strong><br>${boundaryStatus}</p>
            
            ${outsideBoundaryMessage}
            ${landUseSection}
            ${zoningSection}
            ${policiesSection}
            ${actionsSection}
            ${dataSource}
        </div>
    `;
}

// Initialize data layers (placeholder for future features)
function initializeDataLayers() {
    console.log('Data layers ready for initialization');
    // Future: Add layers for transit, amenities, etc.
}

// Layer management functions
function toggleLayers() {
    const layerMenu = `
Available Layers:
• City Boundary ✓ (always visible)
• Land Use Zones (coming soon)
• Zoning Districts (coming soon)
• Transit Routes (coming soon)
• Parks & Recreation (coming soon)

Layer controls will be added in future updates!
    `;
    
    alert(layerMenu);
}

// Search functionality
async function searchLocation() {
    const query = prompt('Search for location, address, or landmark:');
    if (!query) return;
    
    updateSearchLoadingState(true);
    
    // Simulate search - in production would use real geocoding
    const searchResult = await simulateLocationSearch(query);
    
    updateSearchLoadingState(false);
    
    if (searchResult.found) {
        goToLocation(searchResult.lat, searchResult.lng, 16);
        
        // Simulate click at the location to show info
        const fakeEvent = {
            latlng: { lat: searchResult.lat, lng: searchResult.lng }
        };
        handleMapClick(fakeEvent);
    }
    
    let resultText = `Search Results for "${query}":\n\n`;
    if (searchResult.found) {
        resultText += `📍 Found: ${searchResult.name}\n`;
        resultText += `Coordinates: ${searchResult.lat}, ${searchResult.lng}\n`;
        resultText += `Type: ${searchResult.type}\n\n`;
        resultText += 'Map has been moved to this location.';
    } else {
        resultText += `❌ No results found for "${query}"\n\n`;
        resultText += 'Try searching for:\n';
        resultText += '• Street addresses (e.g., "123 Main St")\n';
        resultText += '• Landmarks (e.g., "City Hall", "Pier Park")\n';
        resultText += '• Neighborhoods (e.g., "Queensborough")\n';
        resultText += '• Intersections (e.g., "6th & 6th")';
    }
    
    alert(resultText);
    
    // Store results for layer management
    currentSearchResults = searchResult.results;
}

// Simulate location search (replace with real geocoding service)
async function simulateLocationSearch(query) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Sample locations in New Westminster
    const sampleLocations = [
        { name: 'New Westminster City Hall', lat: 49.2069, lng: -122.9102, type: 'Municipal Building' },
        { name: 'Pier Park', lat: 49.2019, lng: -122.9059, type: 'Park' },
        { name: 'Queens Park', lat: 49.2157, lng: -122.9156, type: 'Park' },
        { name: 'New Westminster Station', lat: 49.2014, lng: -122.9126, type: 'Transit' },
        { name: 'Royal Columbian Hospital', lat: 49.2144, lng: -122.9021, type: 'Healthcare' },
        { name: 'Douglas College', lat: 49.2069, lng: -122.9019, type: 'Education' },
        { name: 'Uptown New Westminster', lat: 49.2206, lng: -122.9126, type: 'Commercial' },
        { name: 'Queensborough', lat: 49.1899, lng: -122.9406, type: 'Neighborhood' }
    ];
    
    // Simple search logic
    const lowerQuery = query.toLowerCase();
    const found = sampleLocations.find(loc => 
        loc.name.toLowerCase().includes(lowerQuery) ||
        loc.type.toLowerCase().includes(lowerQuery)
    );
    
    if (found) {
        return {
            found: true,
            ...found,
            results: [found]
        };
    }
    
    return {
        found: false,
        results: []
    };
}

// Helper functions for new features
function getCurrentMapCenter() {
    if (!map) return null;
    const center = map.getCenter();
    return { lat: center.lat, lng: center.lng };
}

function updateSearchLoadingState(isLoading) {
    const searchBtn = document.querySelector('.control-btn[onclick="searchLocation()"]');
    if (searchBtn) {
        if (isLoading) {
            searchBtn.innerHTML = '<span>⏳</span> Searching...';
            searchBtn.disabled = true;
        } else {
            searchBtn.innerHTML = '<span>🔍</span> Search';
            searchBtn.disabled = false;
        }
    }
}

async function searchNearbyAmenities(lat, lng) {
    alert(`Nearby Amenities Search\n\nLocation: ${lat}, ${lng}\n\nThis feature will search for:\n• Schools and childcare\n• Parks and recreation\n• Transit stops\n• Healthcare facilities\n• Shopping areas\n\nFull implementation coming in next update!`);
}

async function getMoreLocationDetails(lat, lng) {
    if (!window.ocpDataHandler?.isLoaded) {
        alert('Data still loading...');
        return;
    }
    
    try {
        const locationInfo = await window.ocpDataHandler.getLocationInfo(lat, lng);
        
        let details = `Detailed Location Report\n`;
        details += `Coordinates: ${lat}, ${lng}\n\n`;
        
        if (locationInfo.withinBoundary) {
            details += `BOUNDARY STATUS: ✓ Within New Westminster\n\n`;
            
            if (locationInfo.landUse) {
                details += `LAND USE DESIGNATION:\n`;
                details += `• Name: ${locationInfo.landUse.name}\n`;
                details += `• Code: ${locationInfo.landUse.code}\n`;
                details += `• Category: ${locationInfo.landUse.category}\n`;
                details += `• Density: ${locationInfo.landUse.maxDensity}\n\n`;
                
                if (locationInfo.landUse.principalUses) {
                    details += `PRINCIPAL USES:\n`;
                    locationInfo.landUse.principalUses.forEach(use => {
                        details += `• ${use}\n`;
                    });
                    details += '\n';
                }
            }
            
            if (locationInfo.zoning) {
                details += `ZONING INFORMATION:\n`;
                details += `• Zone: ${locationInfo.zoning.name}\n`;
                if (locationInfo.zoning.maxHeight) details += `• Max Height: ${locationInfo.zoning.maxHeight}\n`;
                if (locationInfo.zoning.maxFAR) details += `• Max FAR: ${locationInfo.zoning.maxFAR}\n`;
                if (locationInfo.zoning.lotCoverage) details += `• Lot Coverage: ${locationInfo.zoning.lotCoverage}\n`;
                details += '\n';
            }
            
            if (locationInfo.policies?.length > 0) {
                details += `RELEVANT POLICIES:\n`;
                locationInfo.policies.forEach(policy => {
                    details += `• ${policy.id}: ${policy.title}\n`;
                });
            }
        } else {
            details += `BOUNDARY STATUS: ✗ Outside New Westminster city limits\n\n`;
            details += `This location is not within New Westminster's jurisdiction.\n`;
            details += `Local zoning and land use regulations do not apply here.`;
        }
        
        alert(details);
    } catch (error) {
        alert(`Error getting location details: ${error.message}`);
    }
}

// Keep existing functions from original map.js
async function loadCityBoundary() {
    try {
        console.log('Loading city boundary from GeoJSON...');
        
        const response = await fetch('data/City_Boundary.geojson');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const geojsonData = await response.json();
        console.log('GeoJSON data loaded:', geojsonData);
        
        cityBoundaryLayer = L.geoJSON(geojsonData, {
            style: function(feature) {
                return {
                    fillColor: '#3b82f6',
                    weight: 3,
                    opacity: 0.8,
                    color: '#1e40af',
                    fillOpacity: 0.1
                };
            },
            // Remove popup to prevent interference with location info
            onEachFeature: function(feature, layer) {
                // Don't add popup - let handleMapClick handle all interactions
                // This prevents the boundary popup from interfering
            }
        }).addTo(map);
        
        const bounds = cityBoundaryLayer.getBounds();
        map.fitBounds(bounds, { padding: [20, 20] });
        
        console.log('City boundary loaded successfully from GeoJSON');
        
    } catch (error) {
        console.error('Error loading city boundary:', error);
        showBoundaryError();
        addFallbackBoundary();
    }
}

function showBoundaryError() {
    const errorPopup = L.popup()
        .setLatLng([49.2057, -122.9110])
        .setContent(`
            <div style="font-family: system-ui; text-align: center; color: #ef4444;">
                <h4>⚠️ Boundary Data Error</h4>
                <p>Could not load city boundary from GeoJSON file.</p>
                <p><small>Make sure 'data/City_Boundary.geojson' exists</small></p>
            </div>
        `)
        .openOn(map);
}

function addFallbackBoundary() {
    const fallbackBounds = [
        [49.19, -122.95],
        [49.23, -122.88]
    ];
    
    const fallbackRectangle = L.rectangle(fallbackBounds, {
        color: '#ef4444',
        weight: 2,
        fillOpacity: 0.1
    }).addTo(map);
    
    fallbackRectangle.bindPopup(`
        <div style="font-family: system-ui; text-align: center;">
            <h4>📍 New Westminster (Approximate)</h4>
            <p>Fallback boundary - actual GeoJSON data not loaded</p>
        </div>
    `);
    
    map.fitBounds(fallbackBounds, { padding: [20, 20] });
}

function clearMarkers() {
    currentMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    currentMarkers = [];
}

function updateMapScale() {
    const zoom = map.getZoom();
    console.log('Current zoom level:', zoom);
    
    if (cityBoundaryLayer) {
        const weight = zoom > 15 ? 4 : zoom > 12 ? 3 : 2;
        cityBoundaryLayer.setStyle({ weight: weight });
    }
}

function updateMapInfo() {
    const center = map.getCenter();
    console.log('Map center:', center.lat.toFixed(6), center.lng.toFixed(6));
}

function formatArea(area) {
    if (!area) return 'N/A';
    
    const hectares = area / 10000;
    if (hectares > 100) {
        return `${(hectares / 100).toFixed(1)} km²`;
    } else {
        return `${hectares.toFixed(1)} hectares`;
    }
}

function formatLength(length) {
    if (!length) return 'N/A';
    
    if (length > 1000) {
        return `${(length / 1000).toFixed(1)} km`;
    } else {
        return `${length.toFixed(0)} m`;
    }
}

function goToLocation(lat, lng, zoom = 16) {
    if (map) {
        map.setView([lat, lng], zoom);
    }
}

function addCustomMarker(lat, lng, popupContent) {
    const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(popupContent);
    
    currentMarkers.push(marker);
    return marker;
}

function checkIfWithinBoundary(lat, lng) {
    // Use the data handler's precise boundary check
    if (window.ocpDataHandler?.isLoaded) {
        return window.ocpDataHandler.isWithinNewWestminster(lat, lng);
    }
    
    // Fallback to simple bounds check
    return lat >= 49.19 && lat <= 49.23 && lng >= -122.95 && lng <= -122.88;
}

// Export functions for use in other scripts
window.mapFunctions = {
    goToLocation,
    addCustomMarker,
    clearMarkers,
    toggleLayers,
    searchLocation,
    checkIfWithinBoundary,
    getCurrentMapCenter,
    searchNearbyAmenities,
    getMoreLocationDetails
};
