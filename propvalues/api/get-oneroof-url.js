// api/get-oneroof-url.js
// Dedicated backend function for OneRoof.co.nz using Google Custom Search API

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Only POST requests are accepted.' });
    }

    const { address } = req.body; 

    if (!address) {
        return res.status(400).json({ error: 'Address is required.' });
    }

    // Retrieve API Key and CX from environment variables
    // These must be set in your Vercel project settings under Environment Variables
    const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY; 
    const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX;       

    if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) {
        console.error("Missing Google CSE API Key or CX environment variables.");
        return res.status(500).json({ error: 'Server configuration error: Google API keys not set in Vercel environment variables.' });
    }

    try {
        // Construct the search query to specifically look on oneroof.co.nz
        const searchQuery = `${address} site:oneroof.co.nz`; 
        const encodedSearchQuery = encodeURIComponent(searchQuery);

        const googleSearchApiUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodedSearchQuery}`;

        const apiResponse = await fetch(googleSearchApiUrl);

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json(); // Google API usually returns JSON errors
            console.error(`Google Custom Search API responded with status: ${apiResponse.status}, error:`, errorBody);
            
            // Check for specific Google API errors (e.g., daily limit exceeded, API not enabled)
            let errorMessage = `Google Custom Search API error: ${apiResponse.status}`;
            if (errorBody && errorBody.error && errorBody.error.message) {
                errorMessage += ` - ${errorBody.error.message}`;
            }
            if (apiResponse.status === 403) {
                errorMessage += " (Check API Key, enabled APIs, and daily quotas)";
            }
            return res.status(500).json({ error: errorMessage });
        }

        const responseJson = await apiResponse.json();
        
        // Find the first search result that is a direct property link from OneRoof.co.nz
        // We'll look for links starting with 'https://www.oneroof.co.nz/property/'
        const oneroofPropertyLink = responseJson.items?.find(item => 
            item.link && item.link.startsWith('https://www.oneroof.co.nz/property/')
        );

        if (oneroofPropertyLink) {
            return res.status(200).json({ url: oneroofPropertyLink.link });
        } else {
            // If no direct property link found, but search was successful
            return res.status(404).json({ error: 'No direct OneRoof property link found via Google Search API for this address.' });
        }

    } catch (error) {
        console.error('Backend error (Google Custom Search for OneRoof):', error);
        return res.status(500).json({ error: 'An internal server error occurred for OneRoof link generation.' });
    }
}
