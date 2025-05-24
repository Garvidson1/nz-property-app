// api/get-propertyvalue-url.js
// Modified to scrape "Last Sold" data AND the primary property photo from the PropertyValue.co.nz page

import * as cheerio from 'cheerio'; // Import cheerio for HTML parsing

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
        // Initial API call to get the specific property URL
        const propertyValueApiUrl = `https://www.propertyvalue.co.nz/api/public/clapi/suggestions?q=${encodedAddress}&suggestionTypes=address%2Cstreet%2Clocality&limit=1`;

        const pvResponse = await fetch(propertyValueApiUrl);

        if (!pvResponse.ok) {
            console.error(`PropertyValue.co.nz API responded with status: ${pvResponse.status}`);
            return res.status(pvResponse.status).json({ error: `PropertyValue.co.nz API error: ${pvResponse.status}` });
        }

        const pvData = await pvResponse.json();

        let finalUrl = '';
        let scrapedLastSold = 'N/A';
        let propertyPhotoSrc = 'N/A'; // New variable for the photo source

        if (pvData.suggestions && Array.isArray(pvData.suggestions) && pvData.suggestions.length > 0) {
            const firstSuggestion = pvData.suggestions[0];

            if (firstSuggestion.url) {
                finalUrl = `https://www.propertyvalue.co.nz${firstSuggestion.url}`;

                // --- SCRAPING LOGIC ---
                const propertyPageResponse = await fetch(finalUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
                    }
                });

                if (!propertyPageResponse.ok) {
                    console.error(`PropertyValue.co.nz property page responded with status: ${propertyPageResponse.status}`);
                    return res.status(200).json({ 
                        url: finalUrl, 
                        data: { 
                            lastSold: `Could not load page (${propertyPageResponse.status})`,
                            propertyPhotoSrc: 'N/A' // Ensure photo src is also set on error
                        } 
                    });
                }

                const propertyHtml = await propertyPageResponse.text();
                const $ = cheerio.load(propertyHtml); // Load the HTML into cheerio

                // Extract Last Sold data
                const lastSoldElement = $('strong[testid="lastSoldAttribute"]');
                if (lastSoldElement.length) { 
                    scrapedLastSold = lastSoldElement.text().trim();
                } else {
                    console.log('PropertyValue.co.nz: "Last Sold" element not found.');
                    scrapedLastSold = 'Not Found on Page';
                }

                // Extract Property Photo Source
                const propertyPhotoElement = $('img[testid="property-photo-0"]');
                if (propertyPhotoElement.length) {
                    propertyPhotoSrc = propertyPhotoElement.attr('src');
                } else {
                    console.log('PropertyValue.co.nz: Property photo element not found.');
                    propertyPhotoSrc = 'Not Found on Page';
                }
                // --- END SCRAPING LOGIC ---

            } else {
                return res.status(404).json({ error: 'PropertyValue.co.nz: URL not found in suggestion data.' });
            }
        } else {
            return res.status(404).json({ error: 'PropertyValue.co.nz: No suggestions found for the given address.' });
        }

        // Return the URL AND the scraped data (including new photo source)
        return res.status(200).json({ 
            url: finalUrl,
            data: {
                lastSold: scrapedLastSold,
                propertyPhotoSrc: propertyPhotoSrc // Include the photo source in the response
            }
        });

    } catch (error) {
        console.error('Backend error (PropertyValue.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for PropertyValue.co.nz link/data generation.' });
    }
}
