// my-nz-app/api/scrape-realestate-values.js
const cheerio = require('cheerio'); // Use cheerio instead of puppeteer

module.exports = async (req, res) => {
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
        debugLog.push(`Attempting to fetch HTML for URL: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            debugLog.push(`Failed to fetch URL. Status: ${response.status}, Response: ${errorText.substring(0, 500)}`);
            throw new Error(`Failed to fetch RealEstate.co.nz page: ${response.status}`);
        }

        const html = await response.text();
        debugLog.push('HTML fetched successfully. Loading with Cheerio.');
        const $ = cheerio.load(html);

        // Find the valuation badges using the data-test attribute
        const badges = $('[data-test-reinz-valuation-badge]');

        if (badges.length === 0) {
            debugLog.push('No valuation badges found on the page using [data-test-reinz-valuation-badge].');
            // Log a part of the HTML to debug if the selector is wrong
            debugLog.push('----- HTML SNIPPET (No badges found) -----');
            debugLog.push(html.substring(0, Math.min(html.length, 2000))); // Log first 2000 chars of HTML
            debugLog.push('----- END HTML SNIPPET -----');
        } else {
            debugLog.push(`Found ${badges.length} valuation badges.`);
            badges.each((i, badge) => {
                const labelElement = $(badge).find('p.text-xs');
                const valueElement = $(badge).find('h4[data-test-reinz-valuation-badge-value]');

                const label = labelElement.text().trim().toLowerCase();
                const value = valueElement.text().trim();
                debugLog.push(`Extracted label: "${label}", value: "${value}"`);

                if (label.includes('low')) {
                    scrapedValues.low = value;
                } else if (label.includes('med')) {
                    scrapedValues.medium = value;
                } else if (label.includes('high')) {
                    scrapedValues.high = value;
                }
            });
            debugLog.push('Scraping complete. Extracted values: ' + JSON.stringify(scrapedValues));
        }

        res.status(200).json({ estimatedValues: scrapedValues, debugLog: debugLog });

    } catch (error) {
        debugLog.push(`Error during RealEstate.co.nz scraping: ${error.message}`);
        console.error('Error scraping RealEstate.co.nz values:', error);
        res.status(500).json({ error: `Failed to scrape RealEstate.co.nz values: ${error.message}`, estimatedValues: scrapedValues, debugLog: debugLog });
    } finally {
        console.log('RealEstate.co.nz Scrape Debug Log (Cheerio):', debugLog.join('\n'));
    }
};
