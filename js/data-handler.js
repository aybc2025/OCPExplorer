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
            
            const [landUseResponse, zoningResponse, policiesResponse] = await Promise.all([
                fetch('data/land-use.json'),
                fetch('data/zoning.json'), 
                fetch('data/ocp-policies.json')
            ]);

            // Check if all responses are OK
            if (!landUseResponse.ok || !zoningResponse.ok || !policiesResponse.ok) {
                throw new Error('Failed to load one or more data files');
            }

            // Parse JSON data
            this.data.landUse = await landUseResponse.json();
            this.data.zoning = await zoningResponse.json();
            this.data.policies = await policiesResponse.json();

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
                const searchText = `${designation.name} ${designation.description} ${designation.principalUses?.join(' ')} ${designation.complementaryUses?.join(' ')}`.toLowerCase();
                
                if (keywords.some(keyword => searchText.includes(keyword))) {
                    results.push({
                        type: 'land-use',
                        code,
                        name: designation.name,
                        description: designation.description,
                        category: designation.category,
                        data: designation
                    });
                }
            }
        }

        // Search policies
        if (this.data.policies) {
            for (const [categoryKey, category] of Object.entries(this.data.policies.policies)) {
                for (const [policyKey, policy] of Object.entries(category)) {
                    const searchText = `${policy.title} ${policy.text}`.toLowerCase();
                    
                    if (keywords.some(keyword => searchText.includes(keyword))) {
                        results.push({
                            type: 'policy',
                            code: `${categoryKey}.${policyKey}`,
                            name: policy.title,
                            description: policy.text,
                            category: categoryKey,
                            data: policy
                        });
                    }
                }
            }
        }

        return results;
    }

    // Get policy information
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

    // Check if coordinates are within New Westminster
    async isWithinNewWestminster(lat, lng) {
        // This would typically use the city boundary GeoJSON
        // For now, return a rough bounding box check
        const bounds = {
            north: 49.23,
            south: 49.19,
            east: -122.88,
            west: -122.95
        };

        return lat >= bounds.south && lat <= bounds.north && 
               lng >= bounds.west && lng <= bounds.east;
    }

    // Get information for a specific location
    async getLocationInfo(lat, lng) {
        const info = {
            coordinates: { lat, lng },
            withinBoundary: await this.isWithinNewWestminster(lat, lng),
            landUse: null,
            zoning: null,
            policies: [],
            nearbyFeatures: []
        };

        // In a real implementation, this would use spatial queries
        // For now, we'll provide sample data based on location
        if (info.withinBoundary) {
            // Sample logic - in reality this would use GIS data
            if (lat > 49.21) {
                info.landUse = this.getLandUseInfo('RD');
                info.zoning = this.getZoningInfo('R1');
            } else if (lat > 49.205) {
                info.landUse = this.getLandUseInfo('RM');
                info.zoning = this.getZoningInfo('RM1');
            } else {
                info.landUse = this.getLandUseInfo('MH');
                info.zoning = this.getZoningInfo('MU2');
            }

            // Add relevant policies
            info.policies = this.getPoliciesByCategory('economy').slice(0, 2);
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

    // Search for areas with specific height limits
    searchByHeight(minHeight = null, maxHeight = null) {
        if (!this.isLoaded) {
            return [];
        }

        const results = [];
        
        // Search through zoning districts
        if (this.data.zoning) {
            for (const [categoryKey, category] of Object.entries(this.data.zoning.zoningDistricts)) {
                for (const [zoneKey, zone] of Object.entries(category)) {
                    if (zone.maxHeight) {
                        const heightMatch = this.parseHeight(zone.maxHeight);
                        if (heightMatch && this.isHeightInRange(heightMatch, minHeight, maxHeight)) {
                            results.push({
                                type: 'zoning',
                                code: zoneKey,
                                name: zone.name,
                                height: zone.maxHeight,
                                category: categoryKey,
                                data: zone
                            });
                        }
                    }
                }
            }
        }

        return results;
    }

    // Helper function to parse height strings
    parseHeight(heightString) {
        const match = heightString.match(/(\d+)m/);
        return match ? parseInt(match[1]) : null;
    }

    // Helper function to check if height is in range
    isHeightInRange(height, minHeight, maxHeight) {
        if (minHeight !== null && height < minHeight) return false;
        if (maxHeight !== null && height > maxHeight) return false;
        return true;
    }

    // Get summary statistics
    getDataSummary() {
        if (!this.isLoaded) {
            return null;
        }

        const summary = {
            landUseDesignations: Object.keys(this.data.landUse?.landUseDesignations || {}).length,
            zoningDistricts: this.countZoningDistricts(),
            policies: this.countPolicies(),
            categories: this.getUniqueCategories()
        };

        return summary;
    }

    // Helper to count zoning districts
    countZoningDistricts() {
        if (!this.data.zoning) return 0;
        
        let count = 0;
        for (const category of Object.values(this.data.zoning.zoningDistricts)) {
            count += Object.keys(category).length;
        }
        return count;
    }

    // Helper to count policies
    countPolicies() {
        if (!this.data.policies) return 0;
        
        let count = 0;
        for (const category of Object.values(this.data.policies.policies)) {
            count += Object.keys(category).length;
        }
        return count;
    }

    // Helper to get unique categories
    getUniqueCategories() {
        const categories = new Set();
        
        if (this.data.landUse) {
            for (const designation of Object.values(this.data.landUse.landUseDesignations)) {
                if (designation.category) {
                    categories.add(designation.category);
                }
            }
        }
        
        return Array.from(categories);
    }

    // Export data for AI processing
    prepareContextForAI(location = null, query = null) {
        if (!this.isLoaded) {
            return { error: 'Data not loaded' };
        }

        const context = {
            availableData: this.getDataSummary(),
            queryLocation: location,
            userQuery: query
        };

        // If location provided, add relevant local data
        if (location) {
            // Add nearby land use designations and zoning
            context.relevantDesignations = this.searchByCategory('residential').slice(0, 3);
            context.relevantPolicies = this.getPoliciesByCategory('economy').slice(0, 2);
        }

        // If query provided, add search results
        if (query) {
            context.searchResults = this.searchByKeywords(query).slice(0, 5);
        }

        return context;
    }
}

// Create global instance
window.ocpDataHandler = new OCPDataHandler();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.ocpDataHandler.initialize();
    } catch (error) {
        console.error('Failed to initialize OCP data:', error);
        // Show user-friendly error message
        const propertyInfo = document.getElementById('property-info');
        if (propertyInfo) {
            propertyInfo.innerHTML = `
                <div class="error-message">
                    <h3>⚠️ Data Loading Error</h3>
                    <p>Unable to load OCP data. Please refresh the page or try again later.</p>
                    <small>Error: ${error.message}</small>
                </div>
            `;
        }
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OCPDataHandler;
}
