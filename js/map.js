// Map configuration and initialization
let map;
let currentMarkers = [];

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
    
    // Add city boundary (simple demonstration)
    addCityBoundary();
    
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

function handleMapClick(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    
    // Update property info panel
    updatePropertyInfo(lat, lng);
    
    // Add temporary marker
    clearMarkers();
    const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`
            <div style="text-align: center;">
                <strong>Selected Location</strong><br>
                Lat: ${lat}<br>
                Lng: ${lng}
            </div>
        `)
        .openPopup();
    
    currentMarkers.push(marker);
}

function updatePropertyInfo(lat, lng) {
    const propertyInfo = document.getElementById('property-info');
    
    // For now, display basic location info
    // In future versions, this will fetch real OCP data
    propertyInfo.innerHTML = `
        <div class="property-details">
            <h3>Location Details</h3>
            <p><strong>Coordinates:</strong><br>
            ${lat}, ${lng}</p>
            
            <p><strong>Status:</strong><br>
            Within New Westminster City Limits</p>
            
            <div class="notice">
                <em>Property-specific zoning and land use information will be available in future updates.</em>
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

function addCityBoundary() {
    // Simplified New Westminster boundary
    // In production, this would come from GeoJSON data
    const boundaryCoords = [
        [49.1956, -122.9584],
        [49.2284, -122.9584],
        [49.2284, -122.8636],
        [49.1956, -122.8636],
        [49.1956, -122.9584]
    ];
    
    const cityBoundary = L.polygon(boundaryCoords, {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.8,
        fillColor: '#3b82f6',
        fillOpacity: 0.1
    }).addTo(map);
    
    cityBoundary.bindTooltip('New Westminster City Limits', {
        permanent: false,
        direction: 'center'
    });
}

function updateMapScale() {
    // Update any scale-dependent features
    const zoom = map.getZoom();
    console.log('Current zoom level:', zoom);
    
    // Adjust marker sizes or visibility based on zoom level
    // This can be expanded for different zoom behaviors
}

function updateMapInfo() {
    // Update any location-dependent information
    const center = map.getCenter();
    console.log('Map center:', center.lat.toFixed(6), center.lng.toFixed(6));
}

// Map control functions (called from HTML buttons)
function toggleLayers() {
    alert('Layer controls will be implemented in future updates.\n\nPlanned layers:\n• Zoning Districts\n• Land Use Types\n• Building Heights\n• Transportation\n• Parks & Open Space');
}

function searchLocation() {
    const searchTerm = prompt('Enter an address or location to search:');
    if (searchTerm) {
        alert(`Search functionality will be implemented in future updates.\n\nYou searched for: "${searchTerm}"\n\nThis will include:\n• Address geocoding\n• Property lookup\n• Natural language queries`);
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
    searchLocation
};
