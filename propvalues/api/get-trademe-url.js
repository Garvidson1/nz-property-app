// api/get-trademe-url.js
// Dedicated backend function for TradeMe.co.nz Insights, leveraging Homes.co.nz property ID

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

        // Step 1: Resolve property_id from Homes.co.nz API
        // We rely on this to get the universal property ID that TradeMe Insights uses.
        const homesResolveUrl = `https://gateway.homes.co.nz/property/resolve?address=${encodedAddress}`;
        const homesResolveResponse = await fetch(homesResolveUrl);

        if (!homesResolveResponse.ok) {
            console.error(`Homes.co.nz resolve API (for TradeMe) responded with status: ${homesResolveResponse.status}`);
            // Provide a more specific error message if the Homes.co.nz dependency fails
            return res.status(homesResolveResponse.status).json({ error: `Could not resolve property ID from Homes.co.nz for TradeMe link (Status: ${homesResolveResponse.status}).` });
        }

        const homesResolveData = await homesResolveResponse.json();

        // Check if Homes.co.nz API returned an error or no property ID
        if (homesResolveData.error) {
            return res.status(404).json({ error: `Homes.co.nz resolve error (for TradeMe): ${homesResolveData.error}` });
        }
        if (!homesResolveData.property_id) {
            return res.status(404).json({ error: 'Homes.co.nz: No property ID found for address, cannot generate TradeMe link.' });
        }

        const propertyId = homesResolveData.property_id;

        // Step 2: Construct the final TradeMe Insights URL using the obtained property_id
        // We assume this URL is valid once the property_id is successfully retrieved.
        const tradeMeInsightsUrl = `https://www.trademe.co.nz/a/property/insights/profile/${propertyId}`;
        
        return res.status(200).json({ url: tradeMeInsightsUrl });

    } catch (error) {
        console.error('Backend error (TradeMe.co.nz link generation):', error);
        return res.status(500).json({ error: 'An internal server error occurred while generating the TradeMe link.' });
    }
}
