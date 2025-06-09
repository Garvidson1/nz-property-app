// api/get-realestate-url.js
// Dedicated backend function for RealEstate.co.nz

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
        const searchApiUrl = `https://platform.realestate.co.nz/search/v1/properties/smart?q=${encodedAddress}`;

        // --- ADD THIS LOG ---
        console.log(`RealEstate.co.nz: Fetching from URL: ${searchApiUrl}`);

        const apiResponse = await fetch(searchApiUrl);

        if (!apiResponse.ok) {
            console.error(`RealEstate.co.nz API responded with status: ${apiResponse.status}`);
            // Return a more generic error for the frontend
            return res.status(apiResponse.status).json({ error: `RealEstate.co.nz API error: ${apiResponse.status}` });
        }

        const responseJson = await apiResponse.json();

        // --- ADD THIS LOG ---
        // Log the full data array returned by the API
        console.log('RealEstate.co.nz API response data:', JSON.stringify(responseJson.data, null, 2));

        const propertyObject = responseJson.data && responseJson.data.find(f =>
            f.filter === 'property' && f["address-slug"] && f["short-id"]
        );

        // --- ADD THIS LOG ---
        // Log the property object that was actually found by the .find() method
        console.log('RealEstate.co.nz found property object:', propertyObject);


        if (propertyObject) {
            const addressSlug = propertyObject["address-slug"];
            const shortId = propertyObject["short-id"];
            const finalUrl = `https://www.realestate.co.nz/property/<span class="math-inline">\{addressSlug\}/</span>{shortId}`;

            // --- ADD THIS LOG ---
            console.log(`RealEstate.co.nz: Returning URL: ${finalUrl}`);

            return res.status(200).json({ url: finalUrl });
        } else {
            console.log('RealEstate.co.nz: No direct property link found.'); // Also good to log if not found
            return res.status(404).json({ error: 'No direct property link found for RealEstate.co.nz.' });
        }

    } catch (error) {
        console.error('Backend error (RealEstate.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for RealEstate.co.nz.' });
    }
}
