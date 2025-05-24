// my-nz-app/api/scrape-homes-values.js
const cheerio = require('cheerio'); // Use cheerio

module.exports = async (req, res) => {
    const { url } = req.body;

    if (!url) {
        console.error('Scrape Homes.co.nz Values: URL is required.');
        return res.status(400).json({ error: 'URL is required for scraping estimated values.', estimatedValues: { low: 'Error', medium: 'Error', high: 'Error' } });
    }

    let scrapedValues = {
        low: 'N/A',
        medium: 'N/A',
        high: 'N/A'
    };
    let debugLog = [];

    try {
        debugLog.push(`Attempting to fetch HTML for URL: ${url}`);
        const response = await fetch(url, {
            headers: {
                // Add a user-agent to mimic a real browser request
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            debugLog.push(`Failed to fetch URL. Status: ${response.status}, Response: ${errorText.substring(0, 500)}`);
            throw new Error(`Failed to fetch Homes.co.nz page: ${response.status}`);
        }

        const html = await response.text();
        debugLog.push('HTML fetched successfully. Loading with Cheerio.');
        const $ = cheerio.load(html);

        // --- Medium Value (HomesEstimate) ---
        const mediumValueSpan = $('span.display_price.large');
        if (mediumValueSpan.length > 0) {
            // Prepend '$' to the value if it's found
            scrapedValues.medium = '$' + mediumValueSpan.text().trim();
            debugLog.push(`Found Medium Value: ${scrapedValues.medium}`);
        } else {
            debugLog.push('Medium value (span.display_price.large) element not found.');
        }

        // --- Low and High Values from Estimate Range ---
        const rangePrices = $('div.estimate_range_price span.display_price');

        if (rangePrices.length >= 2) {
            // Prepend '$' to the values if they are found
            scrapedValues.low = '$' + rangePrices.eq(0).text().trim(); // First .display_price in the range
            scrapedValues.high = '$' + rangePrices.eq(1).text().trim(); // Second .display_price in the range
            debugLog.push(`Found Low Value: ${scrapedValues.low}`);
            debugLog.push(`Found High Value: ${scrapedValues.high}`);
        } else if (rangePrices.length > 0) {
            debugLog.push(`Found ${rangePrices.length} display_price elements in range, but expected 2.`);
            debugLog.push('Only partial range found or structure changed.');
        } else {
            debugLog.push('Estimate range price container (div.estimate_range_price) or display_price spans not found.');
        }

        // Check if any values were found, if not, log a snippet for debugging
        if (scrapedValues.low === 'N/A' && scrapedValues.medium === 'N/A' && scrapedValues.high === 'N/A') {
            debugLog.push('No estimated values were found for Homes.co.nz. Logging HTML snippet.');
            debugLog.push('----- HTML SNIPPET (No values found) -----');
            // Log a larger snippet for better debugging if no values found
            debugLog.push(html.substring(0, Math.min(html.length, 5000))); // Log first 5000 chars of HTML
            debugLog.push('----- END HTML SNIPPET -----');
        }

        res.status(200).json({ estimatedValues: scrapedValues, debugLog: debugLog });

    } catch (error) {
        debugLog.push(`Error during Homes.co.nz scraping: ${error.message}`);
        console.error('Error scraping Homes.co.nz values:', error);
        res.status(500).json({ error: `Failed to scrape Homes.co.nz values: ${error.message}`, estimatedValues: scrapedValues, debugLog: debugLog });
    } finally {
        console.log('Homes.co.nz Scrape Debug Log (Cheerio):', debugLog.join('\n'));
    }
};
