// Smart Search functionality for OCP Explorer
// Combines local search with AI-powered natural language queries

class OCPSearchEngine {
    constructor() {
        this.isInitialized = false;
        this.searchHistory = [];
        this.maxHistoryItems = 20;
        this.searchCache = new Map();
        this.maxCacheItems = 50;
    }

    // Initialize the search engine
    async initialize() {
        // Wait for data handler to be ready
        if (!window.ocpDataHandler?.isLoaded) {
            await new Promise(resolve => {
                window.addEventListener('ocpDataLoaded', resolve, { once: true });
            });
        }
        
        this.isInitialized = true;
        console.log('Search engine initialized');
    }

    // Main search function - determines whether to use local or AI search
    async search(query, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const {
            location = null,
            useAI = 'auto', // 'auto', 'local', 'ai'
            maxResults = 10
        } = options;

        // Clean and normalize query
        const cleanQuery = this.cleanQuery(query);
        if (!cleanQuery) {
            return { results: [], method: 'none', error: 'Empty query' };
        }

        // Check cache first
        const cacheKey = `${cleanQuery}_${location?.lat || ''}_${location?.lng || ''}`;
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        try {
            let searchResult;

            // Determine search method
            if (useAI === 'local' || (useAI === 'auto' && this.isSimpleQuery(cleanQuery))) {
                searchResult = await this.localSearch(cleanQuery, location, maxResults);
            } else {
                // Try AI search first, fallback to local if it fails
                try {
                    searchResult = await this.aiSearch(cleanQuery, location, maxResults);
                } catch (aiError) {
                    console.warn('AI search failed, falling back to local search:', aiError);
                    searchResult = await this.localSearch(cleanQuery, location, maxResults);
                    searchResult.fallback = true;
                    searchResult.aiError = aiError.message;
                }
            }

            // Cache result
            this.cacheResult(cacheKey, searchResult);
            
            // Add to search history
            this.addToHistory(cleanQuery, searchResult.method);

            return searchResult;
        } catch (error) {
            console.error('Search error:', error);
            return {
                results: [],
                method: 'error',
                error: error.message,
                suggestion: 'Try simplifying your search or check your internet connection.'
            };
        }
    }

    // Local search using data patterns and keywords
    async localSearch(query, location, maxResults) {
        const results = [];
        const queryLower = query.toLowerCase();

        // 1. Direct keyword matching
        const keywordResults = window.ocpDataHandler.searchByKeywords(query);
        results.push(...keywordResults.slice(0, Math.floor(maxResults * 0.6)));

        // 2. Category-based search
        const categories = this.detectCategories(queryLower);
        for (const category of categories) {
            const categoryResults = window.ocpDataHandler.searchByCategory(category);
            results.push(...categoryResults.slice(0, 2).map(item => ({
                type: 'land-use',
                code: item.code,
                name: item.name,
                description: item.description,
                category: item.category,
                data: item,
                matchReason: `Category: ${category}`
            })));
        }

        // 3. Height-based search
        const heightQuery = this.parseHeightQuery(queryLower);
        if (heightQuery) {
            const heightResults = window.ocpDataHandler.searchByHeight(
                heightQuery.min, 
                heightQuery.max
            );
            results.push(...heightResults.slice(0, 3));
        }

        // 4. Location-specific search
        if (location) {
            const locationInfo = await window.ocpDataHandler.getLocationInfo(location.lat, location.lng);
            if (locationInfo.landUse) {
                results.unshift({
                    type: 'location-specific',
                    name: `Current Location: ${locationInfo.landUse.name}`,
                    description: locationInfo.landUse.description,
                    data: locationInfo,
                    matchReason: 'Your selected location'
                });
            }
        }

        // Remove duplicates and limit results
        const uniqueResults = this.removeDuplicates(results);
        const limitedResults = uniqueResults.slice(0, maxResults);

        return {
            results: limitedResults,
            method: 'local',
            totalFound: uniqueResults.length,
            query: query,
            processingTime: Date.now()
        };
    }

    // AI-powered search using natural language processing
    async aiSearch(query, location, maxResults) {
        // Prepare context for AI
        const context = window.ocpDataHandler.prepareContextForAI(location, query);
        
        // Call the serverless function
        const response = await fetch('/.netlify/functions/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: query,
                context: context,
                location: location,
                maxResults: maxResults
            })
        });

        if (!response.ok) {
            throw new Error(`AI search failed: ${response.status} ${response.statusText}`);
        }

        const aiResult = await response.json();

        // Process AI response into standardized format
        return {
            results: this.processAIResults(aiResult, maxResults),
            method: 'ai',
            aiResponse: aiResult.answer,
            confidence: aiResult.confidence || 0.8,
            citations: aiResult.citations || [],
            query: query,
            processingTime: Date.now()
        };
    }

    // Process AI results into consistent format
    processAIResults(aiResult, maxResults) {
        const results = [];

        // If AI provided structured results
        if (aiResult.structuredResults) {
            results.push(...aiResult.structuredResults.slice(0, maxResults));
        }

        // If AI mentioned specific areas or designations, add them
        if (aiResult.mentionedAreas) {
            for (const area of aiResult.mentionedAreas) {
                const landUseInfo = window.ocpDataHandler.getLandUseInfo(area);
                if (landUseInfo) {
                    results.push({
                        type: 'ai-mentioned',
                        code: area,
                        name: landUseInfo.name,
                        description: landUseInfo.description,
                        data: landUseInfo,
                        matchReason: 'Mentioned by AI'
                    });
                }
            }
        }

        // Add a special AI answer result
        if (aiResult.answer) {
            results.unshift({
                type: 'ai-answer',
                name: 'AI Assistant Response',
                description: aiResult.answer,
                data: aiResult,
                matchReason: 'Natural language processing'
            });
        }

        return results.slice(0, maxResults);
    }

    // Determine if a query is simple enough for local search
    isSimpleQuery(query) {
        const simplePatterns = [
            /^(residential|commercial|mixed.?use|industrial)$/i,
            /^[A-Z]{1,5}\d*$/,  // Zone codes like R1, MU2
            /^\d+\s*(storey|floor|metre|meter)s?$/i,
            /^(height|density|FAR|zoning|land.?use)$/i
        ];

        return simplePatterns.some(pattern => pattern.test(query.trim()));
    }

    // Detect categories from query text
    detectCategories(queryLower) {
        const categoryMap = {
            'residential': ['residential', 'housing', 'homes', 'apartments', 'condos', 'houses'],
            'mixed-use': ['mixed', 'mixed-use', 'mixed use', 'combined'],
            'commercial': ['commercial', 'retail', 'business', 'shops', 'stores'],
            'employment': ['employment', 'industrial', 'work', 'jobs', 'office'],
            'environmental': ['park', 'green', 'environmental', 'nature']
        };

        const detectedCategories = [];
        for (const [category, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(keyword => queryLower.includes(keyword))) {
                detectedCategories.push(category);
            }
        }

        return detectedCategories;
    }

    // Parse height-related queries
    parseHeightQuery(queryLower) {
        // Match patterns like "over 10 storeys", "under 20m", "between 5 and 15 floors"
        const patterns = [
            {
                regex: /over (\d+)\s*(storey|floor|metre|meter)s?/i,
                handler: (match) => ({ min: parseInt(match[1]) * (match[2].includes('storey') || match[2].includes('floor') ? 3 : 1), max: null })
            },
            {
                regex: /under (\d+)\s*(storey|floor|metre|meter)s?/i,
                handler: (match) => ({ min: null, max: parseInt(match[1]) * (match[2].includes('storey') || match[2].includes('floor') ? 3 : 1) })
            },
            {
                regex: /between (\d+) and (\d+)\s*(storey|floor|metre|meter)s?/i,
                handler: (match) => ({ 
                    min: parseInt(match[1]) * (match[3].includes('storey') || match[3].includes('floor') ? 3 : 1),
                    max: parseInt(match[2]) * (match[3].includes('storey') || match[3].includes('floor') ? 3 : 1)
                })
            }
        ];

        for (const pattern of patterns) {
            const match = queryLower.match(pattern.regex);
            if (match) {
                return pattern.handler(match);
            }
        }

        return null;
    }

    // Clean and normalize query
    cleanQuery(query) {
        return query
            .trim()
            .replace(/[^\w\s\-\']/g, ' ')  // Remove special chars except hyphens and apostrophes
            .replace(/\s+/g, ' ')          // Normalize whitespace
            .toLowerCase();
    }

    // Remove duplicate results
    removeDuplicates(results) {
        const seen = new Set();
        return results.filter(result => {
            const key = `${result.type}_${result.code || result.name}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    // Cache search results
    cacheResult(key, result) {
        if (this.searchCache.size >= this.maxCacheItems) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
        
        // Add timestamp for cache expiry (30 minutes)
        result.cached = Date.now();
        this.searchCache.set(key, result);
    }

    // Add to search history
    addToHistory(query, method) {
        this.searchHistory.unshift({
            query,
            method,
            timestamp: Date.now()
        });

        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }
    }

    // Get search suggestions based on query
    getSuggestions(partialQuery) {
        if (!partialQuery || partialQuery.length < 2) {
            return [];
        }

        const suggestions = new Set();
        
        // Common search terms
        const commonTerms = [
            'residential areas', 'commercial zones', 'mixed-use buildings',
            'building heights', 'zoning restrictions', 'office space',
            'healthcare facilities', 'transit areas', 'industrial zones',
            'heritage buildings', 'density limits', 'special employment area'
        ];

        const queryLower = partialQuery.toLowerCase();
        for (const term of commonTerms) {
            if (term.includes(queryLower)) {
                suggestions.add(term);
            }
        }

        // Add from search history
        for (const historyItem of this.searchHistory) {
            if (historyItem.query.toLowerCase().includes(queryLower)) {
                suggestions.add(historyItem.query);
            }
        }

        return Array.from(suggestions).slice(0, 8);
    }

    // Get search statistics
    getSearchStats() {
        const methodCounts = this.searchHistory.reduce((acc, item) => {
            acc[item.method] = (acc[item.method] || 0) + 1;
            return acc;
        }, {});

        return {
            totalSearches: this.searchHistory.length,
            methodBreakdown: methodCounts,
            cacheSize: this.searchCache.size,
            recentQueries: this.searchHistory.slice(0, 5).map(item => item.query)
        };
    }

    // Clear search history and cache
    clearHistory() {
        this.searchHistory = [];
        this.searchCache.clear();
    }
}

// Create global search engine instance
window.ocpSearchEngine = new OCPSearchEngine();

// Initialize when data is ready
window.addEventListener('ocpDataLoaded', async () => {
    await window.ocpSearchEngine.initialize();
});

// Enhanced search function for global use
window.searchOCP = async function(query, options = {}) {
    if (!window.ocpSearchEngine.isInitialized) {
        console.warn('Search engine not ready yet');
        return { results: [], method: 'not-ready', error: 'Search engine initializing...' };
    }

    return await window.ocpSearchEngine.search(query, options);
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OCPSearchEngine;
}
