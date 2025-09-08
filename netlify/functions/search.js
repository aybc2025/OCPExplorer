// Netlify Function for AI-powered OCP search
// Connects to Google Gemini API with security and rate limiting

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080', 
    'http://localhost:8888',
    'https://localhost:3000',
    process.env.URL, // Netlify site URL
    process.env.DEPLOY_PRIME_URL, // Netlify deploy preview URL
];

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map();

// Clean up old rate limit entries every hour
setInterval(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, data] of rateLimitStore.entries()) {
        if (data.resetTime < oneHourAgo) {
            rateLimitStore.delete(key);
        }
    }
}, 60 * 60 * 1000);

exports.handler = async (event, context) => {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    try {
        // 1. SECURITY: Validate HTTP method
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers: getCORSHeaders(event),
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        // 2. SECURITY: Validate origin
        const origin = event.headers.origin || event.headers.referer;
        if (!isAllowedOrigin(origin)) {
            return {
                statusCode: 403,
                headers: getCORSHeaders(event),
                body: JSON.stringify({ error: 'Forbidden origin' })
            };
        }

        // 3. SECURITY: Rate limiting
        const clientIP = event.headers['x-forwarded-for']?.split(',')[0] || 
                        event.headers['x-real-ip'] || 
                        'unknown';
        
        const rateLimitResult = checkRateLimit(clientIP);
        if (!rateLimitResult.allowed) {
            return {
                statusCode: 429,
                headers: {
                    ...getCORSHeaders(event),
                    'Retry-After': Math.ceil(rateLimitResult.resetIn / 1000).toString()
                },
                body: JSON.stringify({ 
                    error: 'Rate limit exceeded',
                    message: `Too many requests. Try again in ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds.`
                })
            };
        }

        // 4. SECURITY: Validate request body
        let requestData;
        try {
            requestData = JSON.parse(event.body);
        } catch (error) {
            return {
                statusCode: 400,
                headers: getCORSHeaders(event),
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }

        // 5. SECURITY: Validate request data
        const validationResult = validateRequest(requestData);
        if (!validationResult.valid) {
            return {
                statusCode: 400,
                headers: getCORSHeaders(event),
                body: JSON.stringify({ error: validationResult.error })
            };
        }

        // 6. Check API key
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            console.error('Google AI API key not configured');
            return {
                statusCode: 500,
                headers: getCORSHeaders(event),
                body: JSON.stringify({ error: 'Service configuration error' })
            };
        }

        // 7. Prepare AI prompt
        const aiPrompt = buildAIPrompt(requestData);
        
        // 8. Call Google Gemini API
        const aiResponse = await callGeminiAPI(apiKey, aiPrompt);
        
        // 9. Process and return response
        const processedResponse = processAIResponse(aiResponse, requestData);
        
        return {
            statusCode: 200,
            headers: getCORSHeaders(event),
            body: JSON.stringify(processedResponse)
        };

    } catch (error) {
        console.error('Function error:', error);
        
        // Don't expose internal errors to client
        const isAPIError = error.message.includes('API') || error.message.includes('fetch');
        const clientError = isAPIError ? 'AI service temporarily unavailable' : 'Internal server error';
        
        return {
            statusCode: 500,
            headers: getCORSHeaders(event),
            body: JSON.stringify({ 
                error: clientError,
                suggestion: 'Please try again in a few moments or simplify your search.'
            })
        };
    }
};

// Helper: Check if origin is allowed
function isAllowedOrigin(origin) {
    if (!origin) return false;
    
    // Check exact matches
    if (allowedOrigins.includes(origin)) return true;
    
    // Check if it's a Netlify deploy preview
    if (origin.includes('--') && origin.includes('.netlify.app')) return true;
    
    // Check localhost with any port
    if (origin.match(/^https?:\/\/localhost:\d+$/)) return true;
    
    return false;
}

// Helper: Get CORS headers
function getCORSHeaders(event) {
    const origin = event.headers.origin;
    const allowedOrigin = isAllowedOrigin(origin) ? origin : allowedOrigins[0];
    
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
}

// Helper: Rate limiting check
function checkRateLimit(clientIP) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 30; // 30 requests per hour per IP
    
    const key = `ratelimit_${clientIP}`;
    const current = rateLimitStore.get(key);
    
    if (!current) {
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + windowMs
        });
        return { allowed: true };
    }
    
    if (now > current.resetTime) {
        // Reset window
        rateLimitStore.set(key, {
            count: 1,
            resetTime: now + windowMs
        });
        return { allowed: true };
    }
    
    if (current.count >= maxRequests) {
        return { 
            allowed: false, 
            resetIn: current.resetTime - now 
        };
    }
    
    // Increment count
    current.count++;
    rateLimitStore.set(key, current);
    return { allowed: true };
}

// Helper: Validate request data
function validateRequest(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Request data must be an object' };
    }
    
    if (!data.question || typeof data.question !== 'string') {
        return { valid: false, error: 'Question is required and must be a string' };
    }
    
    if (data.question.length > 500) {
        return { valid: false, error: 'Question too long (max 500 characters)' };
    }
    
    if (data.question.length < 3) {
        return { valid: false, error: 'Question too short (min 3 characters)' };
    }
    
    // Check for potentially harmful content
    const suspiciousPatterns = [
        /inject|script|eval|exec/i,
        /\<script\>/i,
        /javascript:/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(data.question))) {
        return { valid: false, error: 'Invalid characters in question' };
    }
    
    return { valid: true };
}

// Helper: Build AI prompt
function buildAIPrompt(requestData) {
    const { question, context, location } = requestData;
    
    const systemPrompt = `You are an expert assistant for the New Westminster Official Community Plan (OCP). Your role is to help urban planners and professionals find accurate, specific information about land use, zoning, building heights, and municipal policies.

GUIDELINES:
- Always provide specific, accurate information with references to OCP sections when possible
- If you're not certain about something, say so clearly
- For building heights, be specific about storeys and metres when known
- For zoning questions, mention relevant land use designations (like RD, RM, MH, etc.)
- Include practical implications for development applications
- Cite relevant policy numbers (like 3.1, 3.3, etc.) when applicable
- Answer in Hebrew if the question is in Hebrew, otherwise answer in English

AVAILABLE DATA CONTEXT:
${JSON.stringify(context, null, 2)}

${location ? `LOCATION CONTEXT: The user is asking about coordinates ${location.lat}, ${location.lng}` : ''}

USER QUESTION: ${question}

Please provide a helpful, accurate response:`;

    return systemPrompt;
}

// Helper: Call Google Gemini API
async function callGeminiAPI(apiKey, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.3, // Lower temperature for more factual responses
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 1000,
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH", 
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No response from Gemini API');
    }
    
    return result.candidates[0].content.parts[0].text;
}

// Helper: Process AI response
function processAIResponse(aiResponse, requestData) {
    // Extract any mentioned area codes or policy numbers
    const mentionedAreas = extractMentionedAreas(aiResponse);
    const mentionedPolicies = extractMentionedPolicies(aiResponse);
    
    return {
        answer: aiResponse,
        confidence: 0.85, // Default confidence score
        mentionedAreas: mentionedAreas,
        mentionedPolicies: mentionedPolicies,
        citations: [...mentionedAreas, ...mentionedPolicies],
        timestamp: Date.now(),
        query: requestData.question
    };
}

// Helper: Extract mentioned area designations
function extractMentionedAreas(text) {
    const areaPattern = /\b(RD|RM|RH|RHC|ML|MH|BDMU|SGTMC|C|CHC|ME|IN|U)\b/g;
    const matches = text.match(areaPattern) || [];
    return [...new Set(matches)]; // Remove duplicates
}

// Helper: Extract mentioned policy numbers
function extractMentionedPolicies(text) {
    const policyPattern = /\b\d+\.\d+[a-z]?\b/g;
    const matches = text.match(policyPattern) || [];
    return [...new Set(matches)]; // Remove duplicates
}
