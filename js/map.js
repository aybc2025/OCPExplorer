// New Westminster Map Configuration
let map;
let currentMarkers = [];
let currentOverlays = [];

// New Westminster coordinates and bounds
const NEW_WESTMINSTER = {
    center: [49.2057, -122.9110], // City center coordinates
    bounds: [
        [49.1800, -122.9500], // Southwest corner
        [49.2300, -122.8700]  // Northeast corner
    ]
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

// Initialize the map
function initializeMap() {
    try {
        // Create map instance
        map = L.map('map', {
            center: NEW_WESTMINSTER.center,
            zoom: 13,
            maxBounds: NEW_WESTMINSTER.bounds,
            maxBoundsViscosity: 1.0,
            minZoom: 11,
            maxZoom: 18
        });

        // Add base tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            crossOrigin: true
        }).addTo(map);

        // Add city boundary outline
        addCityBoundary();
        
        // Add key location markers
        addLocationMarkers();
        
        // Add map legend
        addMapLegend();
        
        // Add click event listener
        map.on('click', onMapClick);
        
        console.log('Map initialized successfully');
        
    } catch (error) {
        console.error('Error initializing map:', error);
        showMapError();
    }
}

// Add New Westminster city boundary with much more accurate coordinates
function addCityBoundary() {
    // Main city boundary following actual municipal limits
    // Based on Fraser River, Brunette River, and neighboring municipalities
    const mainCityBoundary = [
        // Starting from northwest, following Brunette River
        [49.2330, -122.9180], // Northwest near Brunette River
        [49.2310, -122.9050], // Along Brunette River
        [49.2280, -122.8920], // Brunette River bend
        [49.2260, -122.8850], // Near Coquitlam border
        [49.2240, -122.8820], // East boundary with Coquitlam
        [49.2200, -122.8800], // Southeast near Sapperton
        [49.2150, -122.8810], // East boundary continuation
        [49.2100, -122.8830], // Curving toward Fraser River
        [49.2050, -122.8880], // Near Fraser River
        [49.2020, -122.8920], // Along Fraser River
        [49.2000, -122.8980], // Fraser River bend
        [49.1980, -122.9050], // South along Fraser River
        [49.1960, -122.9120], // Fraser River curve
        [49.1950, -122.9200], // Southwest Fraser River
        [49.1960, -122.9280], // West along Fraser River
        [49.1980, -122.9350], // Fraser River westward
        [49.2020, -122.9420], // Northwest along Fraser River
        [49.2060, -122.9450], // North along river
        [49.2100, -122.9430], // River bend north
        [49.2140, -122.9400], // Continuing north
        [49.2180, -122.9350], // West boundary with Burnaby
        [49.2220, -122.9320], // North boundary
        [49.2260, -122.9280], // Northwest boundary
        [49.2300, -122.9230], // North toward Brunette
        [49.2330, -122.9180]  // Close polygon at start
    ];
    
    // Queensborough area on Lulu Island (more accurate)
    const queensboroughBoundary = [
        [49.1880, -122.9520], // Northwest Lulu Island
        [49.1920, -122.9350], // Northeast area
        [49.1900, -122.9250], // East boundary
        [49.1860, -122.9200], // Southeast
        [49.1800, -122.9230], // South boundary
        [49.1780, -122.9300], // Southwest
        [49.1770, -122.9400], // West boundary
        [49.1800, -122.9480], // Northwest boundary
        [49.1840, -122.9520], // North boundary
        [49.1880, -122.9520]  // Close polygon
    ];
    
    // Add main city boundary
    L.polygon(mainCityBoundary, {
        color: '#2563eb',
        weight: 3,
        opacity: 0.9,
        fillOpacity: 0.15,
        dashArray: '8, 12'
    }).addTo(map).bindPopup(`
        <div style="text-align: center;">
            <h3 style="margin-bottom: 8px; color: #1e40af;">New Westminster</h3>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Main City Area</strong></p>
            <p style="margin: 4px 0; font-size: 12px;">Following Fraser River, Brunette River</p>
            <p style="margin: 4px 0; font-size: 12px;">and municipal boundaries</p>
            <p style="margin: 8px 0 4px 0; font-size: 11px; color: #6b7280;">Area: 15.6 km²</p>
        </div>
    `);
    
    // Add Queensborough boundary
    L.polygon(queensboroughBoundary, {
        color: '#2563eb',
        weight: 3,
        opacity: 0.9,
        fillOpacity: 0.15,
        dashArray: '8, 12'
    }).addTo(map).bindPopup(`
        <div style="text-align: center;">
            <h3 style="margin-bottom: 8px; color: #1e40af;">Queensborough</h3>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Part of New Westminster</strong></p>
            <p style="margin: 4px 0; font-size: 12px;">Located on Lulu Island</p>
            <p style="margin: 4px 0; font-size: 12px;">Connected by Queensborough Bridge</p>
        </div>
    `);
}

// Add key location markers
function addLocationMarkers() {
    Object.entries(LOCATIONS).forEach(([key, location]) => {
        const marker = L.marker(location.coords, {
            title: location.name
        }).addTo(map);
        
        const popupContent = `
            <div class="location-popup">
                <h3>${location.name}</h3>
                <p>${location.description}</p>
                <button onclick="showLocationDetails('${key}')" class="popup-btn">
                    View Details
                </button>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        currentMarkers.push(marker);
    });
}

// Add map legend
function addMapLegend() {
    const legend = L.control({position: 'bottomleft'});
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <h4>Land Use Designations</h4>
            <div class="legend-item residential">
                <div class="legend-color"></div>
                <span>Residential</span>
            </div>
            <div class="legend-item commercial">
                <div class="legend-color"></div>
                <span>Commercial</span>
            </div>
            <div class="legend-item mixed-use">
                <div class="legend-color"></div>
                <span>Mixed Use</span>
            </div>
            <div class="legend-item industrial">
                <div class="legend-color"></div>
                <span>Industrial</span>
            </div>
            <div class="legend-item parks">
                <div class="legend-color"></div>
                <span>Parks & Recreation</span>
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
    
    // Update sidebar with clicked location info
    updatePropertyInfo({
        coordinates: [lat, lng],
        address: 'Address lookup not yet implemented',
        landUse: 'To be determined based on OCP data',
        zoning: 'To be determined based on zoning data'
    });
    
    // Add temporary marker
    if (window.tempMarker) {
        map.removeLayer(window.tempMarker);
    }
    
    window.tempMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<b>Clicked Location</b><br>Lat: ${lat}<br>Lng: ${lng}`)
        .openPopup();
}

// Update property information in sidebar
function updatePropertyInfo(data) {
    const propertyInfo = document.getElementById('property-info');
    
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
