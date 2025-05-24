// api/get-propertyvalue-url.js
// Modified to scrape "Last Sold" data, primary property photo,
// Capital Value, Land Value, Improvement Value, and Valuation Date
// from the PropertyValue.co.nz page.

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
        let scrapedData = { // Initialize scrapedData object here
            lastSold: 'N/A',
            propertyPhotoSrc: 'N/A',
            capitalValue: 'N/A',
            landValue: 'N/A',
            improvementValue: 'N/A',
            valuationDate: 'N/A'
        };

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
                    // Still return the URL and partial data on page load failure
                    return res.status(200).json({
                        url: finalUrl,
                        data: {
                            lastSold: `Could not load page (${propertyPageResponse.status})`,
                            propertyPhotoSrc: 'N/A', // Ensure photo src is also set on error
                            capitalValue: 'N/A', // Set new fields to N/A on error
                            landValue: 'N/A',
                            improvementValue: 'N/A',
                            valuationDate: 'N/A'
                        }
                    });
                }

                const propertyHtml = await propertyPageResponse.text();
                const $ = cheerio.load(propertyHtml); // Load the HTML into cheerio

                // Helper function to extract value based on label class and value class
                const extractPropertyValue = (labelClass, valueClass) => {
                    const labelElement = $(`div.${labelClass}`);
                    if (labelElement.length > 0) {
                        const valueElement = labelElement.next(`div.${valueClass}`);
                        if (valueElement.length > 0) {
                            return valueElement.text().trim();
                        }
                    }
                    return 'Not Found on Page';
                };

                // Extract Last Sold data
                const lastSoldElement = $('strong[testid="lastSoldAttribute"]');
                if (lastSoldElement.length) {
                    scrapedData.lastSold = lastSoldElement.text().trim();
                } else {
                    console.log('PropertyValue.co.nz: "Last Sold" element not found.');
                    scrapedData.lastSold = 'Not Found on Page';
                }

                // Extract Property Photo Source
                const propertyPhotoElement = $('img[testid="property-photo-0"]');
                if (propertyPhotoElement.length) {
                    scrapedData.propertyPhotoSrc = propertyPhotoElement.attr('src');
                } else {
                    console.log('PropertyValue.co.nz: Property photo element not found.');
                    scrapedData.propertyPhotoSrc = 'Not Found on Page';
                }

                // Extract new valuation data using the helper
                scrapedData.capitalValue = extractPropertyValue('capitalValueLabel', 'capitalValueValue');
                scrapedData.landValue = extractPropertyValue('landValueLabel', 'landValueValue');
                scrapedData.improvementValue = extractPropertyValue('improvementValueLabel', 'improvementValueValue');
                scrapedData.valuationDate = extractPropertyValue('valuationDateLabel', 'valuationDateValue');

                // --- END SCRAPING LOGIC ---

            } else {
                return res.status(404).json({ error: 'PropertyValue.co.nz: URL not found in suggestion data.' });
            }
        } else {
            return res.status(404).json({ error: 'PropertyValue.co.nz: No suggestions found for the given address.' });
        }

        // Return the URL AND all scraped data
        return res.status(200).json({
            url: finalUrl,
            data: scrapedData // Return the entire scrapedData object
        });

    } catch (error) {
        console.error('Backend error (PropertyValue.co.nz):', error);
        return res.status(500).json({ error: 'An internal server error occurred for PropertyValue.co.nz link/data generation.' });
    }
}
