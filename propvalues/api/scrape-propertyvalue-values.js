// my-nz-app/api/scrape-propertyvalue-values.js
const cheerio = require('cheerio'); // Use cheerio

// Helper function to convert currency string to number (duplicated from frontend for server-side calculation)
function parseCurrencyToNumber(currencyString) {
    if (!currencyString || typeof currencyString !== 'string') {
        return NaN;
    }

    // Remove dollar signs, commas, and trim whitespace
    let cleanedString = currencyString.replace(/[\$,]/g, '').trim();

    let numericValue = parseFloat(cleanedString);

    // Handle 'M' for million, 'K' for thousand
    if (cleanedString.endsWith('M')) {
        numericValue *= 1000000;
    } else if (cleanedString.endsWith('K')) {
        numericValue *= 1000;
    }

    return numericValue;
}

// Helper function to format number back to currency (e.g., for medium value)
function formatNumberToCurrency(num) {
    if (isNaN(num)) {
        return 'N/A';
    }

    if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(2)}M`; // Format to 2 decimal places for millions
    } else if (num >= 1000) {
        return `$${(num / 1000).toFixed(0)}K`; // Format to 0 decimal places for thousands (e.g., $500K)
    } else {
        return `$${num.toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
}


module.exports = async (req, res) => {
    const { url } = req.body;

    if (!url) {
        console.error('Scrape PropertyValue.co.nz Values: URL is required.');
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
            throw new Error(`Failed to fetch PropertyValue.co.nz page: ${response.status}`);
        }

        const html = await response.text();
        debugLog.push('HTML fetched successfully. Loading with Cheerio.');
        const $ = cheerio.load(html);

        let lowNumeric = NaN;
        let highNumeric = NaN;

        // --- Low Value ---
        const lowValueDiv = $('div[testid="lowEstimate"]');
        if (lowValueDiv.length > 0) {
            scrapedValues.low = lowValueDiv.text().trim();
            lowNumeric = parseCurrencyToNumber(scrapedValues.low);
            debugLog.push(`Found Low Value: ${scrapedValues.low} (Numeric: ${lowNumeric})`);
        } else {
            debugLog.push('Low value (div[testid="lowEstimate"]) element not found.');
        }

        // --- High Value ---
        const highValueDiv = $('div[testid="highEstimate"]');
        if (highValueDiv.length > 0) {
            scrapedValues.high = highValueDiv.text().trim();
            highNumeric = parseCurrencyToNumber(scrapedValues.high);
            debugLog.push(`Found High Value: ${scrapedValues.high} (Numeric: ${highNumeric})`);
        } else {
            debugLog.push('High value (div[testid="highEstimate"]) element not found.');
        }

        // --- Calculate Medium Value ---
        if (!isNaN(lowNumeric) && !isNaN(highNumeric)) {
            const mediumNumeric = (lowNumeric + highNumeric) / 2;
            scrapedValues.medium = formatNumberToCurrency(mediumNumeric);
            debugLog.push(`Calculated Medium Value: ${scrapedValues.medium}`);
        } else {
            debugLog.push('Could not calculate medium value: Low or High numeric values missing or invalid.');
        }

        // Check if any values were found, if not, log a snippet for debugging
        if (scrapedValues.low === 'N/A' && scrapedValues.medium === 'N/A' && scrapedValues.high === 'N/A') {
            debugLog.push('No estimated values were found for PropertyValue.co.nz. Logging HTML snippet.');
            debugLog.push('----- HTML SNIPPET (No values found) -----');
            // Log a larger snippet for better debugging if no values found
            debugLog.push(html.substring(0, Math.min(html.length, 5000))); // Log first 5000 chars of HTML
            debugLog.push('----- END HTML SNIPPET -----');
        }

        res.status(200).json({ estimatedValues: scrapedValues, debugLog: debugLog });

    } catch (error) {
        debugLog.push(`Error during PropertyValue.co.nz scraping: ${error.message}`);
        console.error('Error scraping PropertyValue.co.nz values:', error);
        res.status(500).json({ error: `Failed to scrape PropertyValue.co.nz values: ${error.message}`, estimatedValues: scrapedValues, debugLog: debugLog });
    } finally {
        console.log('PropertyValue.co.nz Scrape Debug Log (Cheerio):', debugLog.join('\n'));
    }
};
