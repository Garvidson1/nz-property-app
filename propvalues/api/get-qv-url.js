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

        const payload = {
            search_type: "search",
            search_params: {
                search: address
            },
            metrics: {
                search_timestamp: Date.now(),
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
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36' // Added User-Agent
            },
            body: JSON.stringify(payload)
        });

        if (!qvResponse.ok) {
            console.error(`QV.co.nz API responded with status: ${qvResponse.status}`);
            // Attempt to get more detail from the response body if it's JSON
            let errorDetail = `QV.co.nz API error: ${qvResponse.status}`;
            try {
                const errorBody = await qvResponse.text(); // Use text() to avoid JSON parsing errors for non-JSON responses
                console.error('QV.co.nz API error response body:', errorBody);
                if (errorBody.includes("captcha")) { // Example check for common blocks
                    errorDetail += " (Likely bot/CAPTCHA detection)";
                } else if (errorBody.includes("forbidden")) {
                     errorDetail += " (Forbidden - Access Denied)";
                }
            } catch (parseError) {
                console.error('Failed to parse QV.co.nz error response body:', parseError);
            }
            return res.status(qvResponse.status).json({ error: errorDetail });
        }

        const qvData = await qvResponse.json();

        if (qvData.results && Array.isArray(qvData.results) && qvData.results.length > 0) {
            const propertyResult = qvData.results.find(item => item.rank === 0);

            if (propertyResult && propertyResult.url) {
                return res.status(200).json({ url: propertyResult.url });
            } else {
                return res.status(404).json({ error: 'QV.co.nz: No primary property result (rank 0) or URL not found for address.' });
            }
        } else {
            return res.status(404).json({ error: 'QV.co.nz: No results found for the given address.' });
        }

    } catch (error) {
        console.error('Backend error (QV.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for QV.co.nz link generation.' });
    }
}
