// my-nz-app/api/get-realestate-url.js
const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: 'Address is required.' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true, // Use 'true' for production on Vercel
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000); // 60 seconds

        // Construct the search URL for RealEstate.co.nz
        const searchUrl = `https://www.realestate.co.nz/residential/sale/search?by=address&q=${encodeURIComponent(address)}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

        // Wait for search results to load, or for a "no results" message
        // This handles cases where it redirects directly to a property page, or stays on search results
        await page.waitForSelector('.listing-card, .no-results-found__title', { timeout: 10000 }).catch(() => {
            // If neither selector appears, it might be a redirect or a general error
            console.warn('Neither listing card nor no-results message found within timeout.');
        });

        const currentUrl = page.url();
        let propertyUrl = currentUrl;
        let scrapedData = {}; // Initialize as empty for now, we'll add to this later

        // Check if directly landed on a property page (URL contains /property/)
        if (currentUrl.includes('/property/')) {
            console.log(`Directly landed on property page: ${currentUrl}`);
            // The URL is already the property page, so nothing more to do here for the URL
        } else if (await page.$('.listing-card')) {
            console.log('Landed on search results page with listings.');
            // Click the first listing card to go to the property page
            await page.click('.listing-card a');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded' }); // Wait for the navigation to complete
            propertyUrl = page.url(); // Get the new URL after navigation
        } else if (await page.$('.no-results-found__title')) {
            console.log('No results found for the address.');
            propertyUrl = 'No direct link found for this address.';
        } else {
            console.log('Unexpected page state after search, could not find specific property.');
            propertyUrl = 'Could not determine property URL.';
        }

        res.status(200).json({ url: propertyUrl, data: scrapedData });

    } catch (error) {
        console.error('Error in RealEstate.co.nz API:', error);
        res.status(500).json({ error: `Failed to retrieve RealEstate.co.nz link: ${error.message}` });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
