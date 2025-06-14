// my-nz-app/api/scrape-realestate-values.js
// No longer need cheerio as we are fetching JSON
// const cheerio = require('cheerio'); 

module.exports = async (req, res) => {
    // The 'url' in req.body will now be the platformApiUrl from get-realestate-url.js
    const { url } = req.body; 

    if (!url) {
        console.error('Scrape RealEstate Values: URL is required.');
        return res.status(400).json({ error: 'URL is required for scraping estimated values.', estimatedValues: { low: 'Error', medium: 'Error', high: 'Error' } });
    }

    let scrapedValues = {
        low: 'N/A',
        medium: 'N/A',
        high: 'N/A'
    };
    let debugLog = [];

    try {
        debugLog.push(`Attempting to fetch JSON from RealEstate.co.nz platform API for URL: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            debugLog.push(`Failed to fetch URL. Status: ${response.status}, Response: ${errorText.substring(0, 500)}`);
            throw new Error(`Failed to fetch RealEstate.co.nz platform API: ${response.status}`);
        }

        const json = await response.json();
        debugLog.push('JSON fetched successfully. Extracting estimated values.');

        // Extract values from the 'estimated-value' object within the JSON response
        const estimatedValueData = json.data && json.data.attributes && json.data.attributes['estimated-value'];

        if (estimatedValueData) {
            // Format the numeric values as currency strings
            scrapedValues.low = estimatedValueData['value-low'] ? estimatedValueData['value-low'].toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }) : 'N/A';
            scrapedValues.medium = estimatedValueData['value-mid'] ? estimatedValueData['value-mid'].toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }) : 'N/A';
            scrapedValues.high = estimatedValueData['value-high'] ? estimatedValueData['value-high'].toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }) : 'N/A';
            debugLog.push('Scraping complete. Extracted values: ' + JSON.stringify(scrapedValues));
        } else {
            debugLog.push('No estimated-value data found in the JSON response for this property.');
        }
        
        res.status(200).json({ estimatedValues: scrapedValues, debugLog: debugLog });

    } catch (error) {
        debugLog.push(`Error during RealEstate.co.nz platform API scraping: ${error.message}`);
        console.error('Error scraping RealEstate.co.nz platform API values:', error);
        res.status(500).json({ error: `Failed to scrape RealEstate.co.nz values: ${error.message}`, estimatedValues: scrapedValues, debugLog: debugLog });
    } finally {
        console.log('RealEstate.co.nz Scrape Debug Log (JSON API):', debugLog.join('\n'));
    }
};
