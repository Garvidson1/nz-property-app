const fs = require('fs-extra'); // Using fs-extra for easier copy operations
const path = require('path');

const SOURCE_DIR = __dirname;
const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_HTML_PATH = path.join(SOURCE_DIR, 'index.html');
const DEST_INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

const API_KEY_PLACEHOLDER = '%%%PUBLIC_MAPS_API_KEY%%%'; // The placeholder in your HTML
const GOOGLE_API_KEY = process.env.PUBLIC_MAPS_API_KEY; // This is the environment variable Vercel will provide

async function buildSite() {
    try {
        // 1. Ensure the 'dist' directory is clean
        await fs.emptyDir(DIST_DIR);
        console.log(`Cleaned ${DIST_DIR}`);

        // 2. Read index.html
        let indexHtmlContent = await fs.readFile(INDEX_HTML_PATH, 'utf8');

        // 3. Replace the API key placeholder
        if (GOOGLE_API_KEY) {
            indexHtmlContent = indexHtmlContent.replace(API_KEY_PLACEHOLDER, GOOGLE_API_KEY);
            console.log('Google Maps API key injected.');
        } else {
            console.warn(`Environment variable PUBLIC_MAPS_API_KEY is not set. The placeholder "${API_KEY_PLACEHOLDER}" will remain or be empty in your HTML.`);
            indexHtmlContent = indexHtmlContent.replace(API_KEY_PLACEHOLDER, ''); // Ensure it's empty if not set
        }

        // 4. Write the modified index.html to the dist directory
        await fs.outputFile(DEST_INDEX_HTML_PATH, indexHtmlContent);
        console.log(`Modified index.html written to ${DEST_INDEX_HTML_PATH}`);

        // 5. Copy static assets (CSS, favicon, etc.) to the dist directory
        // Assuming your 'styles' directory exists at the root level alongside index.html
        await fs.copy(path.join(SOURCE_DIR, 'styles'), path.join(DIST_DIR, 'styles'));
        console.log('Copied /styles directory.');
        await fs.copy(path.join(SOURCE_DIR, 'favicon.ico'), path.join(DIST_DIR, 'favicon.ico'));
        console.log('Copied favicon.ico.');
        // If you have any other static assets like 'images' or 'fonts', add similar copy lines:
        // await fs.copy(path.join(SOURCE_DIR, 'images'), path.join(DIST_DIR, 'images'));


        console.log('Build complete!');
    } catch (err) {
        console.error('Error during build process:', err);
        process.exit(1); // Exit with an error code
    }
}

buildSite();
