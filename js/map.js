// Map configuration and initialization with real GeoJSON boundary
let map;
let currentMarkers = [];
let cityBoundaryLayer;

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

async function loadCityBoundary() {
    try {
        console.log('Loading city boundary from GeoJSON...');
        
        // Fetch the GeoJSON file
        const response = await fetch('data/City_Boundary.geojson');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const geojsonData = await response.json();
        console.log('GeoJSON data loaded:', geojsonData);
        
        // Add GeoJSON layer to map
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
                // Add popup with boundary info
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
        
        // Fit map to boundary bounds
        const bounds = cityBoundaryLayer.getBounds();
        map.fitBounds(bounds, { padding: [20, 20] });
        
        console.log('City boundary loaded successfully from GeoJSON');
        
    } catch (error) {
        console.error('Error loading city boundary:', error);
        showBoundaryError();
        // Fallback to simple boundary
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
    // Simple fallback boundary if GeoJSON fails to load
    const fallbackBounds = [
        [49.1956, -122.9584],
        [49.2284, -122.9584],
        [49.2284, -122.8636],
        [49.1956, -122.8636],
        [49.1956, -122.9584]
    ];
    
    const fallbackBoundary = L.polygon(fallbackBounds, {
        color: '#ef4444',
        weight: 2,
        opacity: 0.8,
        fillColor: '#ef4444',
        fillOpacity: 0.1,
        dashArray: '5, 5'
    }).addTo(map);
    
    fallbackBoundary.bindTooltip('Fallback City Boundary (Approximate)', {
        permanent: false,
        direction: 'center'
    });
}

function handleMapClick(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    
    // Check if click is within city boundary
    const isWithinBoundary = checkIfWithinBoundary(e.latlng);
    
    // Update property info panel
    updatePropertyInfo(lat, lng, isWithinBoundary);
    
    // Add temporary marker
    clearMarkers();
    const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`
            <div style="text-align: center; font-family: system-ui;">
                <strong>Selected Location</strong><br>
                <span style="font-family: monospace;">${lat}, ${lng}</span><br>
                <span style="color: ${isWithinBoundary ? '#22c55e' : '#ef4444'};">
                    ${isWithinBoundary ? '✓ Within city limits' : '✗ Outside city limits'}
                </span>
            </div>
        `)
        .openPopup();
    
    currentMarkers.push(marker);
}

function checkIfWithinBoundary(latlng) {
    if (!cityBoundaryLayer) return null;
    
    // Check if point is within any of the boundary polygons
    let isWithin = false;
    cityBoundaryLayer.eachLayer(function(layer) {
        if (layer.getBounds && layer.getBounds().contains(latlng)) {
            // More precise check using turf.js would be better, but this is a simple approximation
            isWithin = true;
        }
    });
    
    return isWithin;
}

function updatePropertyInfo(lat, lng, withinBoundary) {
    const propertyInfo = document.getElementById('property-info');
    
    const boundaryStatus = withinBoundary === null 
        ? '<span style="color: #6b7280;">Boundary check unavailable</span>'
        : withinBoundary 
            ? '<span style="color: #22c55e;">✓ Within New Westminster</span>'
            : '<span style="color: #ef4444;">✗ Outside city limits</span>';
    
    propertyInfo.innerHTML = `
        <div class="property-details">
            <h3>Location Details</h3>
            
            <div class="info-section">
                <p><strong>Coordinates:</strong><br>
                <span style="font-family: monospace;">${lat}, ${lng}</span></p>
                
                <p><strong>Boundary Status:</strong><br>
                ${boundaryStatus}</p>
            </div>
            
            <div class="info-section">
                <p><strong>Zoning:</strong><br>
                <em>Available in future updates</em></p>
                
                <p><strong>Land Use:</strong><br>
                <em>Available in future updates</em></p>
            </div>
            
            <div class="notice" style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin-top: 12px;">
                <small><em>Property-specific information will be integrated from the Official Community Plan database in future versions.</em></small>
            </div>
        </div>
    `;
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
    
    // Adjust boundary styling based on zoom level
    if (cityBoundaryLayer) {
        const weight = zoom > 15 ? 4 : zoom > 12 ? 3 : 2;
        cityBoundaryLayer.setStyle({ weight: weight });
    }
}

function updateMapInfo() {
    const center = map.getCenter();
    console.log('Map center:', center.lat.toFixed(6), center.lng.toFixed(6));
}

// Utility functions for formatting
function formatArea(area) {
    if (!area) return 'N/A';
    
    const hectares = area / 10000; // Convert sq meters to hectares
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

// Map control functions (called from HTML buttons)
function toggleLayers() {
    const layerOptions = [
        'City Boundary (Current)',
        'Zoning Districts (Future)',
        'Land Use Types (Future)', 
        'Building Heights (Future)',
        'Transportation (Future)',
        'Parks & Open Space (Future)'
    ];
    
    const currentLayers = cityBoundaryLayer ? '✓ City Boundary loaded from GeoJSON' : '✗ City Boundary failed to load';
    
    alert(`Layer Controls\n\n${currentLayers}\n\nPlanned layers:\n${layerOptions.slice(1).map(layer => `• ${layer}`).join('\n')}\n\nFull layer management will be available in future updates.`);
}

function searchLocation() {
    const searchTerm = prompt('Enter an address or location in New Westminster:');
    if (searchTerm && searchTerm.trim()) {
        alert(`Search Functionality\n\nYou searched for: "${searchTerm}"\n\nPlanned search features:\n• Address geocoding\n• Property lookup by address\n• Natural language queries\n• Integration with BC Assessment data\n\nThis will be implemented in future updates.`);
    }
}

// Utility functions for map operations
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

// Export functions for use in other scripts
window.mapFunctions = {
    goToLocation,
    addCustomMarker,
    clearMarkers,
    toggleLayers,
    searchLocation,
    checkIfWithinBoundary
};
