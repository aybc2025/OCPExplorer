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
    // Handle map clicks
    map.on('click', function(e) {
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
    
    // Get location information from data handler
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
                <h3>Location Details</h3>
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
        landUseSection = `
            <div class="info-section">
                <h4>Land Use Designation</h4>
                <p><strong>${locationInfo.landUse.name} (${locationInfo.landUse.code})</strong></p>
                <p style="font-size: 0.9em; color: #6b7280;">${locationInfo.landUse.description}</p>
                <p><strong>Density:</strong> ${locationInfo.landUse.maxDensity || 'Variable'}</p>
                ${locationInfo.landUse.maxHeight ? `<p><strong>Max Height:</strong> ${locationInfo.landUse.maxHeight}</p>` : ''}
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
    
    let allowedUsesSection = '';
    if (locationInfo.landUse?.principalUses) {
        allowedUsesSection = `
            <div class="info-section">
                <h4>Allowed Uses</h4>
                <ul style="font-size: 0.9em; margin-left: 1rem;">
                    ${locationInfo.landUse.principalUses.slice(0, 4).map(use => `<li>${use}</li>`).join('')}
                    ${locationInfo.landUse.principalUses.length > 4 ? '<li><em>...and more</em></li>' : ''}
                </ul>
            </div>
        `;
    }
    
    let policiesSection = '';
    if (locationInfo.policies?.length > 0) {
        policiesSection = `
            <div class="info-section">
                <h4>Relevant Policies</h4>
                ${locationInfo.policies.slice(0, 2).map(policy => `
                    <p style="font-size: 0.85em;"><strong>${policy.id}:</strong> ${policy.title}</p>
                `).join('')}
            </div>
        `;
    }
    
    propertyInfo.innerHTML = `
        <div class="property-details">
            <h3>📍 Location Analysis</h3>
            
            <div class="info-section">
                <p><strong>Coordinates:</strong><br>
                <span style="font-family: monospace;">${lat}, ${lng}</span></p>
                
                <p><strong>Boundary Status:</strong><br>
                ${boundaryStatus}</p>
            </div>
            
            ${landUseSection}
            ${zoningSection}
            ${allowedUsesSection}
            ${policiesSection}
            
            <div class="action-buttons" style="margin-top: 1rem; text-align: center;">
                <button onclick="searchNearbyAmenities(${lat}, ${lng})" 
                        class="action-btn" style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; margin: 0.25rem;">
                    🔍 Search Nearby
                </button>
                <button onclick="getMoreLocationDetails(${lat}, ${lng})" 
                        class="action-btn" style="background: #10b981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; margin: 0.25rem;">
                    📋 More Details
                </button>
            </div>
            
            <div class="notice" style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 12px;">
                <small><em>Data from New Westminster Official Community Plan (2017). For development applications, verify with current zoning bylaws.</em></small>
            </div>
        </div>
    `;
}

// Enhanced search location function with AI integration
async function searchLocation() {
    const searchTerm = prompt('Search OCP Explorer:\n\nExamples:\n• "mixed-use buildings near SkyTrain"\n• "residential areas over 6 storeys"\n• "commercial zones downtown"\n• "Royal Columbian Hospital area"\n\nWhat would you like to find?');
    
    if (!searchTerm || !searchTerm.trim()) {
        return;
    }
    
    try {
        // Show loading state
        updateSearchLoadingState(true);
        
        // Perform search using the new search engine
        const searchResult = await window.searchOCP(searchTerm, {
            location: getCurrentMapCenter(),
            useAI: 'auto',
            maxResults: 8
        });
        
        // Display results
        displaySearchResults(searchResult, searchTerm);
        
    } catch (error) {
        console.error('Search error:', error);
        alert(`Search Error: ${error.message}\n\nPlease try a simpler search or check your internet connection.`);
    } finally {
        updateSearchLoadingState(false);
    }
}

// Enhanced layer toggle with real data layers
function toggleLayers() {
    if (!window.ocpDataHandler?.isLoaded) {
        alert('Data Layers\n\n⏳ OCP data is still loading...\n\nPlease wait a moment and try again.');
        return;
    }
    
    const availableLayers = [
        { key: 'cityBoundary', name: 'City Boundary', enabled: !!cityBoundaryLayer },
        { key: 'landUse', name: 'Land Use Areas', enabled: !!dataLayers.landUse },
        { key: 'zoning', name: 'Zoning Districts', enabled: !!dataLayers.zoning },
        { key: 'heights', name: 'Building Heights', enabled: !!dataLayers.heights },
        { key: 'transit', name: 'Transit Areas', enabled: !!dataLayers.transit },
        { key: 'searchResults', name: 'Search Results', enabled: currentSearchResults.length > 0 }
    ];
    
    const layerStatus = availableLayers.map(layer => 
        `${layer.enabled ? '✓' : '○'} ${layer.name}`
    ).join('\n');
    
    const newLayers = `
Layer Management:

Current Layers:
${layerStatus}

Planned Features:
• Interactive layer controls
• Color-coded zones
• Height visualization  
• Policy overlays
• Custom layer combinations

Full layer management will be available in the next update.`;

    alert(newLayers);
}

// Initialize data layers when OCP data is loaded
function initializeDataLayers() {
    console.log('Initializing data layers...');
    
    // Create layer groups for different data types
    dataLayers.landUse = L.layerGroup();
    dataLayers.zoning = L.layerGroup();
    dataLayers.heights = L.layerGroup(); 
    dataLayers.transit = L.layerGroup();
    dataLayers.searchResults = L.layerGroup();
    
    // Add layer control (will be enhanced in future updates)
    const overlayMaps = {
        "Land Use Areas": dataLayers.landUse,
        "Zoning Districts": dataLayers.zoning,
        "Building Heights": dataLayers.heights,
        "Transit Areas": dataLayers.transit,
        "Search Results": dataLayers.searchResults
    };
    
    // Note: Full layer implementation would require GeoJSON boundaries for each zone
    console.log('Data layers initialized (display pending GeoJSON implementation)');
}

// Display search results on map and in panel
function displaySearchResults(searchResult, originalQuery) {
    // Clear previous search results
    if (dataLayers.searchResults) {
        dataLayers.searchResults.clearLayers();
    }
    currentSearchResults = [];
    
    if (!searchResult.results || searchResult.results.length === 0) {
        alert(`No Results Found\n\nQuery: "${originalQuery}"\nMethod: ${searchResult.method}\n\nTry:\n• Simplifying your search\n• Using different keywords\n• Searching for general terms like "residential" or "commercial"`);
        return;
    }
    
    // Build results display
    let resultText = `Search Results (${searchResult.results.length})\n`;
    resultText += `Method: ${searchResult.method === 'ai' ? 'AI Assistant' : 'Local Search'}\n`;
    resultText += `Query: "${originalQuery}"\n\n`;
    
    searchResult.results.forEach((result, index) => {
        resultText += `${index + 1}. ${result.name}\n`;
        if (result.description && result.description.length < 100) {
            resultText += `   ${result.description}\n`;
        }
        if (result.matchReason) {
            resultText += `   Match: ${result.matchReason}\n`;
        }
        resultText += '\n';
    });
    
    // Show AI answer if available
    if (searchResult.method === 'ai' && searchResult.aiResponse) {
        resultText += `\n🤖 AI Assistant Answer:\n${searchResult.aiResponse}`;
    }
    
    if (searchResult.fallback) {
        resultText += '\n\n⚠️ AI search unavailable, used local search instead.';
    }
    
    alert(resultText);
    
    // Store results for layer management
    currentSearchResults = searchResult.results;
    
    // TODO: In future update, add visual markers for search results on map
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
        
        if (locationInfo.policies?.length > 0) {
            details += `RELEVANT POLICIES:\n`;
            locationInfo.policies.forEach(policy => {
                details += `• ${policy.id}: ${policy.title}\n`;
            });
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
            onEachFeature: function(feature, layer) {
                if (feature.properties) {
                    const props = feature.properties;
                    layer.bindPopup(`
                        <div style="font-family: system-ui; min-width: 200px;">
                            <h3 style="margin-bottom: 8px; color: #1e40af;">
                                ${props.FULL_NAME || 'New Westminster'}
                            </h3>
                            <p><strong>Area:</strong> ${formatArea(props.SHAPE__Area)}</p>
                            <p><strong>Perimeter:</strong> ${formatLength(props.SHAPE__Length)}</p>
                            <p><strong>District:</strong> ${props.DIST_LABEL || 'N/A'}</p>
                            <p><small>Object ID: ${props.OBJECTID}</small></p>
                        </div>
                    `);
                }
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
    // Simplified boundary check - in production would use proper GIS
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
