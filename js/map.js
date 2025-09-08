// New Westminster Map Configuration - Optimized Version
let map;
let currentMarkers = [];
let currentOverlays = [];

// New Westminster center coordinates (no bounds restrictions)
const NEW_WESTMINSTER = {
    center: [49.2057, -122.9110] // City center coordinates only
};

// Key locations in New Westminster
const LOCATIONS = {
    downtown: {
        coords: [49.2014, -122.9118],
        name: "Downtown New Westminster",
        description: "Regional City Centre with mixed-use development"
    },
    uptown: {
        coords: [49.2192, -122.9127],
        name: "Uptown New Westminster", 
        description: "Local Centre with commercial and residential uses"
    },
    queenborough: {
        coords: [49.1928, -122.8996],
        name: "Queensborough",
        description: "Community Plan area with unique character"
    },
    sapperton: {
        coords: [49.2110, -122.8890],
        name: "Sapperton",
        description: "Historic neighbourhood with heritage assets"
    }
};

// City boundary data source
const BOUNDARY_DATA_URL = './data/City_Boundary.geojson'; // Use external GeoJSON file

// Initialize the map
function initializeMap() {
    try {
        // Create map instance with NO restrictions on movement
        map = L.map('map', {
            center: NEW_WESTMINSTER.center,
            zoom: 13
            // Removed all movement restrictions: maxBounds, maxBoundsViscosity, minZoom, maxZoom
        });

        // Add base tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            crossOrigin: true
        }).addTo(map);

        // Load city boundary from external GeoJSON file
        loadCityBoundary();
        
        // Add key location markers
        addLocationMarkers();
        
        // Add map legend
        addMapLegend();
        
        // Add click event listener
        map.on('click', onMapClick);
        
        console.log('Map initialized successfully - no movement restrictions');
        
    } catch (error) {
        console.error('Error initializing map:', error);
        showMapError();
    }
}

// Load New Westminster city boundary from external GeoJSON file
async function loadCityBoundary() {
    try {
        // Load boundary data from external file instead of hardcoded arrays
        const response = await fetch(BOUNDARY_DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const boundaryData = await response.json();
        
        // Create style function for different boundary types
        const getFeatureStyle = (feature) => {
            const baseStyle = {
                color: '#1e40af',
                weight: 3,
                opacity: 0.95,
                fillOpacity: 0.12,
                dashArray: '10, 8'
            };
            
            // Different styles based on area size or properties
            if (feature.properties.SHAPE__Area > 20000000) {
                return { ...baseStyle, weight: 4 }; // Main city area
            } else if (feature.properties.SHAPE__Area > 5000000) {
                return { ...baseStyle, fillOpacity: 0.08 }; // Queensborough
            } else {
                return { ...baseStyle, weight: 2, fillOpacity: 0.06 }; // Small areas
            }
        };
        
        // Create popup content function
        const getFeaturePopup = (feature) => {
            const props = feature.properties;
            const areaKm2 = (props.SHAPE__Area / 1000000).toFixed(2);
            
            return `
                <div style="text-align: center; font-family: system-ui;">
                    <h3 style="margin-bottom: 8px; color: #1e40af; font-size: 16px;">
                        ${props.FULL_NAME || 'New Westminster'}
                    </h3>
                    <p style="margin: 4px 0; font-size: 14px; font-weight: 600;">
                        ${props.DIST_LABEL || 'City Area'}
                    </p>
                    <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
                        Official municipal boundaries
                    </p>
                    <p style="margin: 8px 0 4px 0; font-size: 11px; color: #9ca3af;">
                        Area: ${areaKm2} km²
                    </p>
                </div>
            `;
        };
        
        // Add boundary features to map
        L.geoJSON(boundaryData, {
            style: getFeatureStyle,
            onEachFeature: function(feature, layer) {
                layer.bindPopup(getFeaturePopup(feature));
            }
        }).addTo(map);
        
        console.log('City boundary loaded successfully from external file');
        
    } catch (error) {
        console.error('Error loading city boundary:', error);
        // Fallback: show error message
        showBoundaryError();
    }
}

// Show boundary loading error
function showBoundaryError() {
    const errorPopup = L.popup()
        .setLatLng(NEW_WESTMINSTER.center)
        .setContent(`
            <div style="font-family: system-ui; text-align: center;">
                <h4 style="color: #ef4444;">Boundary Data Unavailable</h4>
                <p>Unable to load city boundary data.</p>
                <p><small>Check that City_Boundary.geojson exists in ./data/ folder</small></p>
            </div>
        `)
        .openOn(map);
}

// Add key location markers
function addLocationMarkers() {
    Object.entries(LOCATIONS).forEach(([key, location]) => {
        const marker = L.marker(location.coords)
            .addTo(map)
            .bindPopup(`
                <div style="font-family: system-ui; min-width: 200px;">
                    <h3 style="margin-bottom: 8px; color: #1e40af;">${location.name}</h3>
                    <p style="margin: 4px 0; font-size: 14px;">${location.description}</p>
                    <button onclick="showLocationDetails('${key}')" style="
                        margin-top: 8px; 
                        padding: 6px 12px; 
                        background: #1e40af; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer;
                        font-size: 12px;
                    ">View Details</button>
                </div>
            `);
        
        currentMarkers.push(marker);
    });
}

// Add map legend
function addMapLegend() {
    const legend = L.control({position: 'bottomright'});
    
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <h4>Map Legend</h4>
            <div class="legend-item">
                <span class="legend-line city-boundary"></span>
                City Boundary
            </div>
            <div class="legend-item">
                <span class="legend-marker location-marker"></span>
                Key Locations
            </div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

// Handle map clicks
function onMapClick(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    
    // Simulate property data lookup
    const mockData = {
        coordinates: [lat, lng],
        address: `Property near ${lat}, ${lng}`,
        landUse: 'General Urban (Simulated)',
        zoning: 'To be determined through full integration'
    };
    
    updatePropertyInfo(mockData);
    
    // Add temporary marker at clicked location
    if (window.tempMarker) {
        map.removeLayer(window.tempMarker);
    }
    
    window.tempMarker = L.marker(e.latlng)
        .addTo(map)
        .bindPopup(`
            <div style="font-family: system-ui;">
                <h4>Selected Location</h4>
                <p><strong>Coordinates:</strong><br>${lat}, ${lng}</p>
                <p><small>Property details will be available when connected to city database</small></p>
            </div>
        `)
        .openPopup();
}

// Update property information in sidebar
function updatePropertyInfo(data) {
    const propertyInfo = document.getElementById('property-info');
    if (!propertyInfo) return;
    
    propertyInfo.innerHTML = `
        <div class="property-details">
            <h3>Property Information</h3>
            <div class="info-item">
                <strong>Coordinates:</strong><br>
                ${data.coordinates[0]}, ${data.coordinates[1]}
            </div>
            <div class="info-item">
                <strong>Address:</strong><br>
                ${data.address}
            </div>
            <div class="info-item">
                <strong>Land Use:</strong><br>
                ${data.landUse}
            </div>
            <div class="info-item">
                <strong>Zoning:</strong><br>
                ${data.zoning}
            </div>
            <div class="info-note">
                <small>Note: Full OCP data integration coming in next phase</small>
            </div>
        </div>
    `;
}

// Navigation functions
function centerMap() {
    // תמיד חזור למרכז ניו ווסטמינסטר
    map.setView(NEW_WESTMINSTER.center, 13);
}

function showDowntown() {
    const downtown = LOCATIONS.downtown;
    map.setView(downtown.coords, 15);
    
    // Find and open downtown marker popup
    currentMarkers.forEach(marker => {
        if (marker.getLatLng().equals(downtown.coords)) {
            marker.openPopup();
        }
    });
}

function showUptown() {
    const uptown = LOCATIONS.uptown;
    map.setView(uptown.coords, 15);
    
    // Find and open uptown marker popup
    currentMarkers.forEach(marker => {
        if (marker.getLatLng().equals(uptown.coords)) {
            marker.openPopup();
        }
    });
}

// Show location details in sidebar
function showLocationDetails(locationKey) {
    const location = LOCATIONS[locationKey];
    if (!location) return;
    
    updatePropertyInfo({
        coordinates: location.coords,
        address: location.name,
        landUse: location.description,
        zoning: 'Mixed-use development encouraged'
    });
}

// Placeholder functions for future features
function toggleLayers() {
    alert('Layer toggle feature coming soon!\n\nThis will allow you to show/hide:\n• Land use designations\n• Zoning boundaries\n• Transportation networks\n• Heritage sites');
}

function searchLocation() {
    const searchTerm = prompt('Search for a location in New Westminster:\n\n(Note: Full search functionality coming soon)');
    
    if (searchTerm) {
        alert(`Searching for: "${searchTerm}"\n\nFull address and policy search coming in next phase!`);
    }
}

// Error handling
function showMapError() {
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = `
        <div class="map-loading">
            <h3>Map Loading Error</h3>
            <p>Unable to load the map. Please check your internet connection and refresh the page.</p>
            <button onclick="location.reload()" class="action-btn">Reload Page</button>
        </div>
    `;
}

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing New Westminster OCP Explorer...');
    initializeMap();
});
