// api/get-homes-url.js
// Dedicated backend function for Homes.co.nz

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

        // Step 1: Resolve property_id from address
        const resolveUrl = `https://gateway.homes.co.nz/property/resolve?address=${encodedAddress}`;
        const resolveResponse = await fetch(resolveUrl);

        if (!resolveResponse.ok) {
            console.error(`Homes.co.nz resolve API responded with status: ${resolveResponse.status}`);
            return res.status(resolveResponse.status).json({ error: `Homes.co.nz resolve API error: ${resolveResponse.status}` });
        }

        const resolveData = await resolveResponse.json();

        if (resolveData.error) {
            return res.status(404).json({ error: `Homes.co.nz: ${resolveData.error}` });
        }
        if (!resolveData.property_id) {
            return res.status(404).json({ error: 'Homes.co.nz: No property ID found for address.' });
        }

        const propertyId = resolveData.property_id;

        // Step 2: Get property details using property_id
        const detailsUrl = `https://gateway.homes.co.nz/properties?property_ids=${propertyId}`;
        const detailsResponse = await fetch(detailsUrl);

        if (!detailsResponse.ok) {
            console.error(`Homes.co.nz details API responded with status: ${detailsResponse.status}`);
            return res.status(detailsResponse.status).json({ error: `Homes.co.nz details API error: ${detailsResponse.status}` });
        }

        const detailsData = await detailsResponse.json();

        // === CHANGE HERE: Correctly parse the 'cards' array and find the URL ===
        const propertyCard = detailsData.cards && detailsData.cards.find(
            card => card.property_id === propertyId // Find the specific card where 'property_id' matches
        );

        if (propertyCard && propertyCard.url) {
            // Construct the final Homes.co.nz URL
            // The 'url' from the API is a path (e.g., "/auckland/beach-haven/21-neptune-avenue/kOgyn")
            // so we prepend the base domain and "/address"
            const finalUrl = `https://homes.co.nz/address${propertyCard.url}`;
            return res.status(200).json({ url: finalUrl });
        } else {
            return res.status(404).json({ error: 'Homes.co.nz: Property card or URL path not found in details response.' });
        }

    } catch (error) {
        console.error('Backend error (Homes.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for Homes.co.nz link generation.' });
    }
}
