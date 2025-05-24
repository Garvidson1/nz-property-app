// api/get-propertyvalue-url.js
// Modified to scrape "Last Sold" data from the PropertyValue.co.nz property page

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
        // This is the initial API call to get the specific property URL
        const propertyValueApiUrl = `https://www.propertyvalue.co.nz/api/public/clapi/suggestions?q=${encodedAddress}&suggestionTypes=address%2Cstreet%2Clocality&limit=1`;

        const pvResponse = await fetch(propertyValueApiUrl);

        if (!pvResponse.ok) {
            console.error(`PropertyValue.co.nz API responded with status: ${pvResponse.status}`);
            return res.status(pvResponse.status).json({ error: `PropertyValue.co.nz API error: ${pvResponse.status}` });
        }

        const pvData = await pvResponse.json();

        let finalUrl = '';
        let scrapedLastSold = 'N/A'; // Default value if not found

        if (pvData.suggestions && Array.isArray(pvData.suggestions) && pvData.suggestions.length > 0) {
            const firstSuggestion = pvData.suggestions[0];
            
            if (firstSuggestion.url) {
                // Construct the full URL for the property page
                finalUrl = `https://www.propertyvalue.co.nz${firstSuggestion.url}`;

                // --- NEW SCRAPING LOGIC STARTS HERE ---
                // Step A: Fetch the HTML content of the actual property page
                const propertyPageResponse = await fetch(finalUrl, {
                    headers: {
                        // It's good practice to send a User-Agent when scraping
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
                    }
                });

                if (!propertyPageResponse.ok) {
                    console.error(`PropertyValue.co.nz property page responded with status: ${propertyPageResponse.status}`);
                    // Even if scraping fails, we still want to return the URL if we got it
                    return res.status(200).json({ 
                        url: finalUrl, 
                        data: { lastSold: `Could not load page (${propertyPageResponse.status})` } // Changed scrapedLastSold to lastSold for consistency
                    });
                }

                const propertyHtml = await propertyPageResponse.text();
                const $ = cheerio.load(propertyHtml); // Load the HTML into cheerio

                // Step B: Use cheerio to find the specific element and extract its text
                // We target the strong tag with the specific testid attribute
                const lastSoldElement = $('strong[testid="lastSoldAttribute"]');
                if (lastSoldElement.length) { // Check if the element was found
                    scrapedLastSold = lastSoldElement.text().trim();
                } else {
                    console.log('PropertyValue.co.nz: "Last Sold" element not found with testid="lastSoldAttribute"');
                    scrapedLastSold = 'Not Found on Page';
                }
                // --- NEW SCRAPING LOGIC ENDS HERE ---

            } else {
                // No URL found from the initial API call
                return res.status(404).json({ error: 'PropertyValue.co.nz: URL not found in suggestion data.' });
            }
        } else {
            // No suggestions found from the initial API call
            return res.status(404).json({ error: 'PropertyValue.co.nz: No suggestions found for the given address.' });
        }

        // Return the URL and the scraped data
        return res.status(200).json({ 
            url: finalUrl,
            data: {
                lastSold: scrapedLastSold // Send the scraped data back
            }
        });

    } catch (error) {
        console.error('Backend error (PropertyValue.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for PropertyValue.co.nz link/data generation.' });
    }
}
