const { onCall } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

// CORS configuration
const corsOptions = {
  origin: [
    "https://mdelaneycastle.github.io",
    "https://castle-comms.web.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

const corsHandler = cors(corsOptions);

exports.scrapeArtworkData = onCall(
  { region: "europe-west1" },
  async (request) => {
    const { data } = request;
    const context = request.auth;
    // Verify admin authentication
    if (!context || !context.token || !context.token.admin) {
        throw new Error('Admin access required');
    }

    const { url } = data;

    if (!url || !url.includes('castlefineart.com')) {
        throw new Error('Invalid Castle Fine Art URL');
    }

    try {
        console.log(`Scraping artwork data from: ${url}`);

        // Fetch the page
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);

        // Extract artist name
        let artist = '';
        const vendorElement = $('[data-block-id="vendor"] a.vendor');
        if (vendorElement.length > 0) {
            artist = vendorElement.text().trim();
        }

        // Extract title
        let title = '';
        const titleElement = $('[data-block-id="title"] .product-title');
        if (titleElement.length > 0) {
            title = titleElement.text().trim();
        }

        // Extract edition information
        let edition = '';
        const editionElement = $('.additional-text');
        if (editionElement.length > 0) {
            edition = editionElement.text().trim();
        }

        // Extract main image from product gallery
        let imageUrl = '';

        // Look for the main product gallery image first (with is-initial class)
        const galleryImage = $('.product-gallery__media.is-initial img').first();
        if (galleryImage.length > 0) {
            imageUrl = galleryImage.attr('src');
        }

        // Fallback: look for any product gallery image
        if (!imageUrl) {
            const anyGalleryImage = $('.product-gallery__media img').first();
            if (anyGalleryImage.length > 0) {
                imageUrl = anyGalleryImage.attr('src');
            }
        }

        // Clean up image URL and get high-quality version
        if (imageUrl) {
            if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
            } else if (imageUrl.startsWith('/')) {
                imageUrl = 'https://www.castlefineart.com' + imageUrl;
            }

            // Ensure we get a high-quality version by requesting width=1200
            if (imageUrl.includes('?v=') && imageUrl.includes('&width=')) {
                imageUrl = imageUrl.replace(/&width=\d+/, '&width=1200');
            } else if (imageUrl.includes('?v=')) {
                imageUrl = imageUrl + '&width=1200';
            }
        }

        // Validate extracted data
        if (!title || !artist) {
            console.warn('Could not extract all required data:', { title, artist, edition, imageUrl });
            return {
                success: false,
                error: 'Could not extract artwork title or artist from the page'
            };
        }

        const extractedData = {
            title: title,
            artist: artist,
            edition: edition || 'Edition information not found',
            imageUrl: imageUrl || 'https://placehold.co/910x910/667eea/white?text=No+Image',
            sourceUrl: url,
            extractedAt: new Date().toISOString()
        };

        console.log('Successfully extracted artwork data:', extractedData);

        return {
            success: true,
            data: extractedData
        };

    } catch (error) {
        console.error('Scraping error:', error);

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            throw new Error('Could not connect to the website');
        }

        if (error.response && error.response.status === 404) {
            throw new Error('Artwork page not found');
        }

        throw new Error('Failed to scrape artwork data: ' + error.message);
    }
});

// Alternative HTTP endpoint for direct calls
exports.scrapeArtworkHttp = onRequest(
  { region: "europe-west1", cors: true },
  async (req, res) => {
    // Handle CORS
    corsHandler(req, res, async () => {

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { url, adminToken } = req.body;

        if (!url || !adminToken) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        // Basic admin token validation (in production, use proper JWT verification)
        if (adminToken !== 'admin-scraping-token') {
            res.status(403).json({ error: 'Invalid admin token' });
            return;
        }

        const result = await scrapeArtworkDataInternal(url);
        res.json(result);

    } catch (error) {
        console.error('HTTP scraping error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
    });
  }
);

// Internal scraping function
async function scrapeArtworkDataInternal(url) {
    if (!url || !url.includes('castlefineart.com')) {
        throw new Error('Invalid Castle Fine Art URL');
    }

    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Extract data using the patterns you specified
    let artist = '';
    const vendorElement = $('div.product-info__block-item[data-block-id="vendor"][data-block-type="vendor"] a.vendor.link-faded');
    if (vendorElement.length > 0) {
        artist = vendorElement.text().trim();
    }

    let title = '';
    const titleElement = $('div.product-info__block-item[data-block-id="title"] h1.product-title.h3');
    if (titleElement.length > 0) {
        title = titleElement.text().trim();
    }

    let edition = '';
    const editionElement = $('span.additional-text');
    if (editionElement.length > 0) {
        edition = editionElement.text().trim();
    }

    // Extract main image from product gallery
    let imageUrl = '';

    // Look for the main product gallery image first (with is-initial class)
    const galleryImage = $('.product-gallery__media.is-initial img').first();
    if (galleryImage.length > 0) {
        imageUrl = galleryImage.attr('src');
    }

    // Fallback: look for any product gallery image
    if (!imageUrl) {
        const anyGalleryImage = $('.product-gallery__media img').first();
        if (anyGalleryImage.length > 0) {
            imageUrl = anyGalleryImage.attr('src');
        }
    }

    // Clean up image URL and get high-quality version
    if (imageUrl) {
        if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.castlefineart.com' + imageUrl;
        }

        // Ensure we get a high-quality version by requesting width=1200
        if (imageUrl.includes('?v=') && imageUrl.includes('&width=')) {
            imageUrl = imageUrl.replace(/&width=\d+/, '&width=1200');
        } else if (imageUrl.includes('?v=')) {
            imageUrl = imageUrl + '&width=1200';
        }
    }

    if (!title || !artist) {
        return {
            success: false,
            error: 'Could not extract artwork title or artist'
        };
    }

    return {
        success: true,
        data: {
            title,
            artist,
            edition: edition || 'Edition information not found',
            imageUrl: imageUrl || 'https://placehold.co/910x910/667eea/white?text=No+Image',
            sourceUrl: url,
            extractedAt: new Date().toISOString()
        }
    };
}