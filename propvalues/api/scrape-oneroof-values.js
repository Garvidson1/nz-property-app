// my-nz-app/api/scrape-oneroof-values.js
const cheerio = require('cheerio'); // Use cheerio

module.exports = async (req, res) => {
    const { url } = req.body;

    if (!url) {
        console.error('Scrape OneRoof Values: URL is required.');
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
            throw new Error(`Failed to fetch OneRoof.co.nz page: ${response.status}`);
        }

        const html = await response.text();
        debugLog.push('HTML fetched successfully. Loading with Cheerio.');
        const $ = cheerio.load(html);

        // --- Low Value ---
        // Look for the div with text "Low" and then navigate to its sibling for the value
        const lowValueDiv = $('div.text-neutral-5:contains("Low")').prev('div');
        if (lowValueDiv.length > 0) {
            scrapedValues.low = lowValueDiv.text().trim();
            debugLog.push(`Found Low Value: ${scrapedValues.low}`);
        } else {
            debugLog.push('Low value element not found.');
        }

        // --- Medium Value ---
        // The medium value seems to be unique with its specific classes
        const mediumValueDiv = $('.text-3xl.font-bold.text-secondary');
        if (mediumValueDiv.length > 0) {
            // A more precise way to get the text, often helps with duplication issues
            // This attempts to get the direct text content without children's text
            // or by cleaning up potential duplicates
            let mediumText = mediumValueDiv.text().trim();

            // Check if the text contains a duplicate, e.g., "$1.24M$1.24M"
            // If it does, attempt to extract only the first occurrence or a unique part
            const match = mediumText.match(/(\$[0-9\.]+[MKB]?)/); // Matches something like $1.24M, $1.5K, etc.
            if (match && match[1]) {
                mediumText = match[1]; // Take only the first match
            } else if (mediumText.length > 0 && mediumText.length % 2 === 0 && mediumText.substring(0, mediumText.length / 2) === mediumText.substring(mediumText.length / 2)) {
                // Fallback heuristic for simple duplication (e.g. "XXYY" -> "XX")
                mediumText = mediumText.substring(0, mediumText.length / 2);
            }

            scrapedValues.medium = mediumText;
            debugLog.push(`Found Medium Value: ${scrapedValues.medium}`);
        } else {
            debugLog.push('Medium value element not found.');
        }

        // --- High Value ---
        // Look for the div with text "High" and then navigate to its sibling for the value
        const highValueDiv = $('div.text-neutral-5:contains("High")').prev('div');
        if (highValueDiv.length > 0) {
            scrapedValues.high = highValueDiv.text().trim();
            debugLog.push(`Found High Value: ${scrapedValues.high}`);
        } else {
            debugLog.push('High value element not found.');
        }

        // Check if any values were found, if not, log a snippet for debugging
        if (scrapedValues.low === 'N/A' && scrapedValues.medium === 'N/A' && scrapedValues.high === 'N/A') {
            debugLog.push('No estimated values were found for OneRoof.co.nz. Logging HTML snippet.');
            debugLog.push('----- HTML SNIPPET (No values found) -----');
            debugLog.push(html.substring(0, Math.min(html.length, 2000))); // Log first 2000 chars of HTML
            debugLog.push('----- END HTML SNIPPET -----');
        }


        res.status(200).json({ estimatedValues: scrapedValues, debugLog: debugLog });

    } catch (error) {
        debugLog.push(`Error during OneRoof.co.nz scraping: ${error.message}`);
        console.error('Error scraping OneRoof.co.nz values:', error);
        res.status(500).json({ error: `Failed to scrape OneRoof.co.nz values: ${error.message}`, estimatedValues: scrapedValues, debugLog: debugLog });
    } finally {
        console.log('OneRoof.co.nz Scrape Debug Log (Cheerio):', debugLog.join('\n'));
    }
};
