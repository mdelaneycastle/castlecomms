const { onCall } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const axios = require('axios');
const cheerio = require('cheerio');

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

        // Extract main image (910x910)
        let imageUrl = '';
        const mainImages = $('img').filter((i, el) => {
            const src = $(el).attr('src');
            const width = $(el).attr('width');
            const height = $(el).attr('height');

            // Look for 910x910 images or main product images
            return (src && (
                (width === '910' && height === '910') ||
                src.includes('910x910') ||
                $(el).hasClass('product-image') ||
                $(el).closest('.product-images').length > 0
            ));
        });

        if (mainImages.length > 0) {
            imageUrl = $(mainImages[0]).attr('src');

            // Handle relative URLs
            if (imageUrl && imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
            } else if (imageUrl && imageUrl.startsWith('/')) {
                imageUrl = 'https://www.castlefineart.com' + imageUrl;
            }
        }

        // If no specific 910x910 image found, try to find any main product image
        if (!imageUrl) {
            const productImages = $('.product-image, .main-image, [class*="product"][class*="image"]');
            if (productImages.length > 0) {
                imageUrl = $(productImages[0]).attr('src');

                if (imageUrl && imageUrl.startsWith('//')) {
                    imageUrl = 'https:' + imageUrl;
                } else if (imageUrl && imageUrl.startsWith('/')) {
                    imageUrl = 'https://www.castlefineart.com' + imageUrl;
                }
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
            imageUrl: imageUrl || 'https://via.placeholder.com/910x910/667eea/white?text=No+Image',
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
  { region: "europe-west1" },
  async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    // Find the main 910x910 image
    let imageUrl = '';
    const images = $('img');
    images.each((i, el) => {
        const src = $(el).attr('src');
        if (src && (src.includes('910x910') ||
                   $(el).attr('width') === '910' && $(el).attr('height') === '910')) {
            imageUrl = src;
            return false; // Break the loop
        }
    });

    // Clean up image URL
    if (imageUrl) {
        if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.castlefineart.com' + imageUrl;
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
            imageUrl: imageUrl || 'https://via.placeholder.com/910x910/667eea/white?text=No+Image',
            sourceUrl: url,
            extractedAt: new Date().toISOString()
        }
    };
}