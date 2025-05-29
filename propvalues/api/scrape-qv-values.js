// api/scrape-qv-values.js
const cheerio = require('cheerio'); // Use cheerio

module.exports = async (req, res) => {
    const { url } = req.body;

    if (!url) {
        console.error('Scrape QV Values: URL is required.');
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
            throw new Error(`Failed to fetch QV.co.nz page: ${response.status}`);
        }

        const html = await response.text();
        debugLog.push('HTML fetched successfully. Loading with Cheerio.');
        const $ = cheerio.load(html);

        // --- Medium Value (QV Estimate) ---
        // Find the div with class 't-copy_xxl' that contains 'QV: '
        // We'll then extract the text and parse the value.
        const qvEstimateDiv = $('div.t-copy_xxl:contains("QV:")');
        if (qvEstimateDiv.length > 0) {
            let qvText = qvEstimateDiv.text().trim();
            // Expected format: "QV: $1,200,000"
            const match = qvText.match(/QV:\s*(\$[0-9,.]+)/);
            if (match && match[1]) {
                scrapedValues.medium = match[1];
                debugLog.push(`Found QV Medium Value: ${scrapedValues.medium}`);
            } else {
                debugLog.push(`QV estimate text found but value could not be parsed: ${qvText}`);
            }
        } else {
            debugLog.push('QV estimate element (div.t-copy_xxl with "QV:") not found.');
        }

        // For QV, we are only looking for the medium value from the specified HTML structure.
        // Low and High values are not typically displayed in the same manner on QV's main estimate section,
        // so they will remain 'N/A' unless other scraping logic is added later.

        // Check if any values were found, if not, log a snippet for debugging
        if (scrapedValues.low === 'N/A' && scrapedValues.medium === 'N/A' && scrapedValues.high === 'N/A') {
            debugLog.push('No estimated values were found for QV.co.nz. Logging HTML snippet.');
            debugLog.push('----- HTML SNIPPET (No values found) -----');
            debugLog.push(html.substring(0, Math.min(html.length, 2000))); // Log first 2000 chars of HTML
            debugLog.push('----- END HTML SNIPPET -----');
        }

        res.status(200).json({ estimatedValues: scrapedValues, debugLog: debugLog });

    } catch (error) {
        debugLog.push(`Error during QV.co.nz scraping: ${error.message}`);
        console.error('Error scraping QV.co.nz values:', error);
        res.status(500).json({ error: `Failed to scrape QV.co.nz values: ${error.message}`, estimatedValues: scrapedValues, debugLog: debugLog });
    } finally {
        console.log('QV.co.nz Scrape Debug Log (Cheerio):', debugLog.join('\n'));
    }
};
