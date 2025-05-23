// api/get-realestate-url.js
// This code runs on Vercel's server, not in your browser.

export default async function handler(req, res) {
    // Make sure it's a POST request (your frontend sends POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Only POST requests are accepted.' });
    }

    // Get the address from the request body
    const { address } = req.body; 

    if (!address) {
        return res.status(400).json({ error: 'Address is required.' });
    }

    try {
        const encodedAddress = encodeURIComponent(address);
        const searchApiUrl = `https://platform.realestate.co.nz/search/v1/properties/smart?q=${encodedAddress}`;

        // Make the request to RealEstate.co.nz from Vercel's server
        const apiResponse = await fetch(searchApiUrl);
        
        if (!apiResponse.ok) {
            console.error(`RealEstate.co.nz API responded with status: ${apiResponse.status}`);
            return res.status(apiResponse.status).json({ error: 'Failed to fetch data from RealEstate.co.nz API.' });
        }

        const responseJson = await apiResponse.json(); // Get the full JSON response
        
        // --- CRITICAL CHANGE HERE ---
        // Access the 'data' array directly from the responseJson
        // Then, find the first object where 'filter' is 'property' AND it has address-slug and short-id
        const propertyObject = responseJson.data && responseJson.data.find(f => 
            f.filter === 'property' && f["address-slug"] && f["short-id"]
        );

        if (propertyObject) {
            const addressSlug = propertyObject["address-slug"];
            const shortId = propertyObject["short-id"];
            const finalUrl = `https://www.realestate.co.nz/property/${addressSlug}/${shortId}`;
            
            // Send the final URL back to your browser
            return res.status(200).json({ url: finalUrl });
        } else {
            return res.status(404).json({ error: 'No matching property found or insufficient data for URL generation.' });
        }

    } catch (error) {
        console.error('Backend error:', error);
        return res.status(500).json({ error: 'An internal server error occurred.' });
    }
}
