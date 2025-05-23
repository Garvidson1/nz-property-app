// api/get-oneroof-url.js
// Dedicated backend function for OneRoof.co.nz

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
        const oneRoofSearchApiUrl = `https://www.oneroof.co.nz/v2.6/address/search?key=${encodedAddress}&typeId=-100`;

        const apiResponse = await fetch(oneRoofSearchApiUrl);

        if (!apiResponse.ok) {
            console.error(`OneRoof.co.nz API responded with status: ${apiResponse.status}`);
            // Return a more generic error for the frontend
            return res.status(apiResponse.status).json({ error: `OneRoof.co.nz API error: ${apiResponse.status}` });
        }

        const responseJson = await apiResponse.json();
        
        const firstResult = responseJson.data && responseJson.data[0];

        if (firstResult && firstResult.slug) {
            const slug = firstResult.slug;
            const finalUrl = `https://www.oneroof.co.nz/property/${slug}`;
            return res.status(200).json({ url: finalUrl });
        } else {
            return res.status(404).json({ error: 'No direct property link found for OneRoof.co.nz.' });
        }

    } catch (error) {
        console.error('Backend error (OneRoof.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for OneRoof.co.nz.' });
    }
}
