// api/get-qv-url.js
// Dedicated backend function for QV.co.nz

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Only POST requests are accepted.' });
    }

    const { address } = req.body; 

    if (!address) {
        return res.status(400).json({ error: 'Address is required.' });
    }

    try {
        const qvApiUrl = 'https://www.qv.co.nz/api/property-search-address/';

        // Construct the payload exactly as specified for the POST request
        const payload = {
            search_type: "search",
            search_params: {
                search: address // Use the user's provided address
            },
            metrics: {
                search_timestamp: Date.now(), // Dynamic timestamp
                search_type: "search",
                total_cache_hits: 0,
                total_results: 0,
                total_results_displayed: 0,
                page: "property_search"
            }
        };

        const qvResponse = await fetch(qvApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Important: specify content type for JSON payload
            },
            body: JSON.stringify(payload) // Convert payload to JSON string
        });

        if (!qvResponse.ok) {
            console.error(`QV.co.nz API responded with status: ${qvResponse.status}`);
            return res.status(qvResponse.status).json({ error: `QV.co.nz API error: ${qvResponse.status}` });
        }

        const qvData = await qvResponse.json();

        // Check if results array exists and has at least one item
        if (qvData.results && Array.isArray(qvData.results) && qvData.results.length > 0) {
            // Find the item with rank: 0 as specified
            const propertyResult = qvData.results.find(item => item.rank === 0);

            if (propertyResult && propertyResult.url) {
                // Return the URL found
                return res.status(200).json({ url: propertyResult.url });
            } else {
                // If no rank 0 result or URL is missing
                return res.status(404).json({ error: 'QV.co.nz: No primary property result (rank 0) or URL not found for address.' });
            }
        } else {
            // If the results array is empty or not an array
            return res.status(404).json({ error: 'QV.co.nz: No results found for the given address.' });
        }

    } catch (error) {
        console.error('Backend error (QV.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for QV.co.nz link generation.' });
    }
}
