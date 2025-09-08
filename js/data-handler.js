// Data Handler for OCP Explorer
// Manages loading and querying of local OCP data

class OCPDataHandler {
    constructor() {
        this.data = {
            landUse: null,
            zoning: null,
            policies: null,
            cityBoundary: null
        };
        this.isLoaded = false;
        this.loadingPromise = null;
        this.boundaryGeometry = null; // Store parsed boundary geometry
    }

    // Initialize and load all data
    async initialize() {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this.loadAllData();
        return this.loadingPromise;
    }

    // Load all data files
    async loadAllData() {
        try {
            console.log('Loading OCP data...');
            
            const [landUseResponse, zoningResponse, policiesResponse, boundaryResponse] = await Promise.all([
                fetch('data/land-use.json'),
                fetch('data/zoning.json'), 
                fetch('data/ocp-policies.json'),
                fetch('data/City_Boundary.geojson')
            ]);

            // Check if all responses are OK
            if (!landUseResponse.ok || !zoningResponse.ok || !policiesResponse.ok || !boundaryResponse.ok) {
                throw new Error('Failed to load one or more data files');
            }

            // Parse JSON data
            this.data.landUse = await landUseResponse.json();
            this.data.zoning = await zoningResponse.json();
            this.data.policies = await policiesResponse.json();
            this.data.cityBoundary = await boundaryResponse.json();

            // Process boundary geometry for precise point-in-polygon checks
            this.processBoundaryGeometry();

            this.isLoaded = true;
            console.log('OCP data loaded successfully');
            
            // Trigger data loaded event
            window.dispatchEvent(new CustomEvent('ocpDataLoaded', { 
                detail: { dataHandler: this } 
            }));

            return this.data;
        } catch (error) {
            console.error('Error loading OCP data:', error);
            throw error;
        }
    }

    // Process boundary geometry for efficient point-in-polygon checks
    processBoundaryGeometry() {
        if (!this.data.cityBoundary || !this.data.cityBoundary.features) {
            console.warn('No boundary data available');
            return;
        }

        // Extract all polygon coordinates from the GeoJSON
        this.boundaryGeometry = [];
        
        this.data.cityBoundary.features.forEach(feature => {
            if (feature.geometry && feature.geometry.type === 'Polygon') {
                // Each polygon can have multiple rings (exterior + holes)
                feature.geometry.coordinates.forEach(ring => {
                    this.boundaryGeometry.push(ring);
                });
            }
        });

        console.log('Boundary geometry processed:', this.boundaryGeometry.length, 'rings');
    }

    // Precise point-in-polygon check using ray casting algorithm
    isPointInPolygon(lat, lng, polygon) {
        let inside = false;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0]; // longitude
            const yi = polygon[i][1]; // latitude
            const xj = polygon[j][0]; // longitude
            const yj = polygon[j][1]; // latitude
            
            if (((yi > lat) !== (yj > lat)) && 
                (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }

    // Check if coordinates are within New Westminster using precise geometry
    async isWithinNewWestminster(lat, lng) {
        if (!this.boundaryGeometry || this.boundaryGeometry.length === 0) {
            console.warn('Boundary geometry not available, using fallback bounds');
            // Fallback to rough bounds if geometry not available
            const bounds = {
                north: 49.23,
                south: 49.19,
                east: -122.88,
                west: -122.95
            };
            return lat >= bounds.south && lat <= bounds.north && 
                   lng >= bounds.west && lng <= bounds.east;
        }

        // Check against all boundary polygons
        for (const ring of this.boundaryGeometry) {
            if (this.isPointInPolygon(lat, lng, ring)) {
                return true;
            }
        }

        return false;
    }

    // Get land use information for a specific designation code
    getLandUseInfo(designationCode) {
        if (!this.isLoaded || !this.data.landUse) {
            console.warn('Data not loaded yet');
            return null;
        }

        const designation = this.data.landUse.landUseDesignations[designationCode];
        return designation || null;
    }

    // Get zoning information for a specific zone
    getZoningInfo(zoneCode) {
        if (!this.isLoaded || !this.data.zoning) {
            console.warn('Data not loaded yet');
            return null;
        }

        // Search through all zoning categories
        for (const category of Object.values(this.data.zoning.zoningDistricts)) {
            if (category[zoneCode]) {
                return category[zoneCode];
            }
        }
        return null;
    }

    // Search land use designations by category
    searchByCategory(category) {
        if (!this.isLoaded || !this.data.landUse) {
            return [];
        }

        const results = [];
        const designations = this.data.landUse.landUseDesignations;
        
        for (const [code, designation] of Object.entries(designations)) {
            if (designation.category === category) {
                results.push({ code, ...designation });
            }
        }
        
        return results;
    }

    // Search by keywords in land use or zoning
    searchByKeywords(query) {
        if (!this.isLoaded) {
            return [];
        }

        const keywords = query.toLowerCase().split(' ');
        const results = [];

        // Search land use designations
        if (this.data.landUse) {
            for (const [code, designation] of Object.entries(this.data.landUse.landUseDesignations)) {
                const searchText = `${designation.name} ${designation.description} ${designation.category}`.toLowerCase();
                
                if (keywords.some(keyword => searchText.includes(keyword))) {
                    results.push({
                        type: 'landUse',
                        code,
                        ...designation
                    });
                }
            }
        }

        // Search zoning districts
        if (this.data.zoning) {
            for (const [categoryName, category] of Object.entries(this.data.zoning.zoningDistricts)) {
                for (const [zoneCode, zone] of Object.entries(category)) {
                    const searchText = `${zone.name} ${zone.description || ''} ${categoryName}`.toLowerCase();
                    
                    if (keywords.some(keyword => searchText.includes(keyword))) {
                        results.push({
                            type: 'zoning',
                            code: zoneCode,
                            category: categoryName,
                            ...zone
                        });
                    }
                }
            }
        }

        return results;
    }

    // Get policy by path (e.g., "housing.1.1")
    getPolicy(policyPath) {
        if (!this.isLoaded || !this.data.policies) {
            return null;
        }

        const pathParts = policyPath.split('.');
        let current = this.data.policies.policies;
        
        for (const part of pathParts) {
            current = current[part];
            if (!current) return null;
        }
        
        return current;
    }

    // Get all policies for a category
    getPoliciesByCategory(category) {
        if (!this.isLoaded || !this.data.policies) {
            return [];
        }

        const categoryPolicies = this.data.policies.policies[category];
        if (!categoryPolicies) return [];

        return Object.entries(categoryPolicies).map(([key, policy]) => ({
            id: key,
            ...policy
        }));
    }

    // Get information for a specific location
    async getLocationInfo(lat, lng) {
        const withinBoundary = await this.isWithinNewWestminster(lat, lng);
        
        const info = {
            coordinates: { lat, lng },
            withinBoundary: withinBoundary,
            landUse: null,
            zoning: null,
            policies: [],
            nearbyFeatures: []
        };

        // Always provide information, but mark boundary status clearly
        // In a real implementation, this would use spatial queries based on actual zoning maps
        if (withinBoundary) {
            // Sample logic based on location within New Westminster
            if (lat > 49.21) {
                info.landUse = this.getLandUseInfo('RD');
                info.zoning = this.getZoningInfo('RS1');
            } else if (lat > 49.205) {
                info.landUse = this.getLandUseInfo('RM');
                info.zoning = this.getZoningInfo('RM1');
            } else {
                info.landUse = this.getLandUseInfo('MH');
                info.zoning = this.getZoningInfo('MU2');
            }

            // Add relevant policies for areas within the city
            info.policies = this.getPoliciesByCategory('economy').slice(0, 2);
        } else {
            // For points outside the boundary, provide limited information
            info.landUse = null;
            info.zoning = null;
            info.policies = [];
        }

        return info;
    }

    // Get development guidelines for an area
    getDevelopmentGuidelines(areaType) {
        if (!this.isLoaded || !this.data.policies) {
            return null;
        }

        return this.data.policies.developmentGuidelines[areaType] || null;
    }

    // Search for areas with specific characteristics
    searchAreas(criteria) {
        if (!this.isLoaded) {
            return [];
        }

        const results = [];
        
        // This would be enhanced with actual spatial data
        // For now, return sample results based on criteria
        
        if (criteria.maxDensity) {
            const landUseResults = this.searchByCategory('residential')
                .filter(area => area.maxDensity <= criteria.maxDensity);
            results.push(...landUseResults);
        }
        
        return results;
    }

    // Get statistics about the city
    getCityStats() {
        if (!this.isLoaded) {
            return null;
        }

        // Calculate from boundary data if available
        let totalArea = 0;
        let perimeter = 0;
        
        if (this.data.cityBoundary && this.data.cityBoundary.features) {
            this.data.cityBoundary.features.forEach(feature => {
                if (feature.properties) {
                    totalArea += feature.properties.SHAPE__Area || 0;
                    perimeter += feature.properties.SHAPE__Length || 0;
                }
            });
        }

        return {
            totalArea: totalArea,
            perimeter: perimeter,
            landUseTypes: this.data.landUse ? Object.keys(this.data.landUse.landUseDesignations).length : 0,
            zoningDistricts: this.data.zoning ? 
                Object.values(this.data.zoning.zoningDistricts)
                    .reduce((count, category) => count + Object.keys(category).length, 0) : 0
        };
    }
}

// Create global instance
window.ocpDataHandler = new OCPDataHandler();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.ocpDataHandler.initialize().catch(error => {
        console.error('Failed to initialize OCP data:', error);
    });
});
