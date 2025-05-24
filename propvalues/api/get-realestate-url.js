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
            headless: true,
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
        await page.waitForSelector('.listing-card, .no-results-found__title', { timeout: 10000 }).catch(() => {
            // If neither selector appears, it might be a redirect or a general error
            console.warn('Neither listing card nor no-results message found within timeout.');
        });

        const currentUrl = page.url();

        let propertyUrl = currentUrl;
        let scrapedData = {
            estimatedValues: {
                low: 'N/A',
                medium: 'N/A',
                high: 'N/A'
            }
        };

        // Check if redirected to a specific property page or if there are search results
        if (currentUrl.includes('/property/')) {
            console.log(`Directly landed on property page: ${currentUrl}`);
            propertyUrl = currentUrl; // The URL is already the property page

            // Scrape estimated values from the property page
            scrapedData.estimatedValues = await page.evaluate(() => {
                const values = {};
                const badges = document.querySelectorAll('[data-test-reinz-valuation-badge]');

                badges.forEach(badge => {
                    const labelElement = badge.querySelector('p.text-xs');
                    const valueElement = badge.querySelector('h4[data-test-reinz-valuation-badge-value]');

                    if (labelElement && valueElement) {
                        const label = labelElement.textContent.trim().toLowerCase();
                        const value = valueElement.textContent.trim();
                        if (label.includes('low')) {
                            values.low = value;
                        } else if (label.includes('med')) {
                            values.medium = value;
                        } else if (label.includes('high')) {
                            values.high = value;
                        }
                    }
                });
                return values;
            });

        } else if (await page.$('.listing-card')) {
            console.log('Landed on search results page with listings.');
            // Click the first listing card to go to the property page
            await page.click('.listing-card a');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
            propertyUrl = page.url();

            // Scrape estimated values from the newly navigated property page
            scrapedData.estimatedValues = await page.evaluate(() => {
                const values = {};
                const badges = document.querySelectorAll('[data-test-reinz-valuation-badge]');

                badges.forEach(badge => {
                    const labelElement = badge.querySelector('p.text-xs');
                    const valueElement = badge.querySelector('h4[data-test-reinz-valuation-badge-value]');

                    if (labelElement && valueElement) {
                        const label = labelElement.textContent.trim().toLowerCase();
                        const value = valueElement.textContent.trim();
                        if (label.includes('low')) {
                            values.low = value;
                        } else if (label.includes('med')) {
                            values.medium = value;
                        } else if (label.includes('high')) {
                            values.high = value;
                        }
                    }
                });
                return values;
            });

        } else if (await page.$('.no-results-found__title')) {
            console.log('No results found for the address.');
            propertyUrl = 'No direct link found for this address.';
            // Estimated values remain 'N/A' as initialized
        } else {
            console.log('Unexpected page state after search.');
            propertyUrl = 'Could not determine property URL.';
        }

        res.status(200).json({ url: propertyUrl, data: scrapedData });

    } catch (error) {
        console.error('Error in RealEstate.co.nz API:', error);
        res.status(500).json({ error: `Failed to retrieve RealEstate.co.nz link or data: ${error.message}` });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
