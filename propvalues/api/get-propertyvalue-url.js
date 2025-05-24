// api/get-propertyvalue-url.js
// Dedicated backend function for PropertyValue.co.nz

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Only POST requests are accepted.' });
    }

    const { address } = req.body; 

    if (!address) {
        return res.status(400).json({ error: 'Address is required.' });
    }

    try {
        const encodedAddress = encodeURIComponent(address);

        // Construct the API URL for PropertyValue.co.nz
        const propertyValueApiUrl = `https://www.propertyvalue.co.nz/api/public/clapi/suggestions?q=${encodedAddress}&suggestionTypes=address%2Cstreet%2Clocality&limit=1`;

        const pvResponse = await fetch(propertyValueApiUrl);

        if (!pvResponse.ok) {
            console.error(`PropertyValue.co.nz API responded with status: ${pvResponse.status}`);
            return res.status(pvResponse.status).json({ error: `PropertyValue.co.nz API error: ${pvResponse.status}` });
        }

        const pvData = await pvResponse.json();

        // Check if suggestions array exists and has at least one item
        if (pvData.suggestions && Array.isArray(pvData.suggestions) && pvData.suggestions.length > 0) {
            const firstSuggestion = pvData.suggestions[0];
            
            if (firstSuggestion.url) {
                // The API returns a relative URL, so we prepend the base domain
                const finalUrl = `https://www.propertyvalue.co.nz${firstSuggestion.url}`;
                return res.status(200).json({ url: finalUrl });
            } else {
                return res.status(404).json({ error: 'PropertyValue.co.nz: URL not found in suggestion data.' });
            }
        } else {
            return res.status(404).json({ error: 'PropertyValue.co.nz: No suggestions found for the given address.' });
        }

    } catch (error) {
        console.error('Backend error (PropertyValue.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for PropertyValue.co.nz link generation.' });
    }
}
