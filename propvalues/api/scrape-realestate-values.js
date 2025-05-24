// my-nz-app/api/scrape-realestate-values.js
const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required for scraping estimated values.' });
    }

    let browser = null;
    let scrapedValues = {
        low: 'N/A',
        medium: 'N/A',
        high: 'N/A'
    };

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

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Wait for the valuation badges to load, if they exist.
        // The catch block ensures the script doesn't fail if they aren't present.
        await page.waitForSelector('[data-test-reinz-valuation-badge]', { timeout: 10000 }).catch(() => {
            console.warn(`RealEstate.co.nz: Valuation badges not found on ${url} within timeout.`);
            // If selector not found, scrapedValues will remain N/A
        });

        const extractedValues = await page.evaluate(() => {
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

        // Merge extracted values with defaults to ensure all keys are present
        scrapedValues = { ...scrapedValues, ...extractedValues };

        res.status(200).json({ estimatedValues: scrapedValues });

    } catch (error) {
        console.error('Error scraping RealEstate.co.nz values:', error);
        res.status(500).json({ error: `Failed to scrape RealEstate.co.nz values: ${error.message}`, estimatedValues: scrapedValues });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
