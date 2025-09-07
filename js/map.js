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

// Add New Westminster city boundary
// Add New Westminster city boundary with accurate coordinates
function addCityBoundary() {
    // More accurate city boundary coordinates based on geographic features
    // Main city area (excluding Queensborough)
    const mainCityBoundary = [
        [49.2320, -122.9200], // North boundary near Brunette River
        [49.2280, -122.8950], // Northeast near Coquitlam
        [49.2250, -122.8800], // East boundary
        [49.2150, -122.8750], // Southeast boundary
        [49.2050, -122.8850], // Near Fraser River bend
        [49.1980, -122.9000], // South along Fraser River
        [49.1950, -122.9150], // Southwest Fraser River
        [49.1980, -122.9350], // West along Fraser River
        [49.2100, -122.9450], // Northwest boundary
        [49.2200, -122.9300], // North boundary continuation
        [49.2320, -122.9200]  // Close polygon
    ];
    
    // Queensborough area (part of New Westminster on Lulu Island)
    const queensboroughBoundary = [
        [49.1850, -122.9500], // Northwest of Lulu Island
        [49.1900, -122.9200], // Northeast area
        [49.1750, -122.9150], // Southeast area  
        [49.1700, -122.9400], // Southwest area
        [49.1850, -122.9500]  // Close polygon
    ];
    
    // Add main city boundary
    L.polygon(mainCityBoundary, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.1,
        dashArray: '10, 10'
    }).addTo(map).bindPopup('<h3>New Westminster - Main City</h3><p>City boundaries following Fraser River, Brunette River, and municipal limits</p>');
    
    // Add Queensborough boundary
    L.polygon(queensboroughBoundary, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.1,
        dashArray: '10, 10'
    }).addTo(map).bindPopup('<h3>New Westminster - Queensborough</h3><p>Part of New Westminster located on Lulu Island</p>');
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
