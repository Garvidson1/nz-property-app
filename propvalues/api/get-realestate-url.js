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

        const apiResponse = await fetch(searchApiUrl);

        if (!apiResponse.ok) {
            console.error(`RealEstate.co.nz API responded with status: ${apiResponse.status}`);
            return res.status(apiResponse.status).json({ error: `RealEstate.co.nz API error: ${apiResponse.status}` });
        }

        const responseJson = await apiResponse.json();

        // Normalize the requested address by taking only the street number and name part
        // Example: "1/68 Beulah Avenue, Rothesay Bay" -> "1/68 Beulah Avenue"
        const parsedRequestedStreetAddress = address.split(',')[0].toLowerCase().trim();

        const propertyObject = responseJson.data && responseJson.data.find(f =>
            f.filter === 'property' &&
            f["address-slug"] &&
            f["short-id"] &&
            f["street-address"] && // Ensure 'street-address' property exists
            // Compare the parsed street address from the API response with the parsed requested address
            f["street-address"].toLowerCase().trim() === parsedRequestedStreetAddress
        );

        if (propertyObject) {
            const addressSlug = propertyObject["address-slug"];
            const shortId = propertyObject["short-id"];
            const realEstateUrl = `https://www.realestate.co.nz/property/${addressSlug}/${shortId}`;
            const platformApiUrl = `https://platform.realestate.co.nz/search/v1/properties/${shortId}`; // New API URL for direct data fetching

            // Return both URLs: 'url' for the public link and 'data.platformApiUrl' for scraping
            return res.status(200).json({ url: realEstateUrl, data: { platformApiUrl: platformApiUrl } });
        } else {
            return res.status(404).json({ error: 'No direct property link found for RealEstate.co.nz.' });
        }

    } catch (error) {
        console.error('Backend error (RealEstate.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for RealEstate.co.nz.' });
    }
}
