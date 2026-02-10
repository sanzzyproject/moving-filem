const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// Konfigurasi CORS agar frontend bisa akses
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// --- CLASS SCRAPER (DIGABUNG DISINI) ---
class KlikXXIScraper {
    constructor() {
        this.baseURL = 'https://klikxxi.me';
        // User Agent yang lebih valid agar tidak di-blokir
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://klikxxi.me/',
            'Connection': 'keep-alive'
        };
    }

    async getHome() {
        try {
            const response = await axios.get(this.baseURL, { headers: this.headers });
            const $ = cheerio.load(response.data);
            const results = [];

            // Selector disesuaikan dengan struktur klikxxi terbaru
            $('#gmr-main-load .item-infinite').each((index, element) => {
                const item = $(element);
                const title = item.find('.entry-title a').text().trim();
                const url = item.find('.entry-title a').attr('href');
                let thumbnail = item.find('img').attr('data-lazy-src') || item.find('img').attr('src');
                
                // Fix thumbnail URL jika relative
                if (thumbnail && !thumbnail.startsWith('http')) {
                    thumbnail = thumbnail.startsWith('//') ? 'https:' + thumbnail : this.baseURL + thumbnail;
                }

                if (title && url) {
                    results.push({
                        title,
                        url,
                        thumbnail,
                        rating: item.find('.gmr-rating-item').text().replace('icon_star', '').trim(),
                        quality: item.find('.gmr-quality-item').text().trim(),
                        duration: item.find('.gmr-duration-item').text().trim()
                    });
                }
            });
            return { success: true, results };
        } catch (e) {
            console.error("Scraper Error:", e.message);
            return { success: false, message: e.message, results: [] };
        }
    }

    async search(query) {
        try {
            const params = new URLSearchParams();
            params.append('s', query);
            params.append('post_type[]', 'post');
            
            const response = await axios.get(`${this.baseURL}/`, { 
                params, 
                headers: this.headers 
            });
            
            const $ = cheerio.load(response.data);
            const results = [];

            $('#gmr-main-load .item-infinite').each((index, element) => {
                const item = $(element);
                const title = item.find('.entry-title a').text().trim();
                const url = item.find('.entry-title a').attr('href');
                let thumbnail = item.find('img').attr('data-lazy-src') || item.find('img').attr('src');

                 if (thumbnail && !thumbnail.startsWith('http')) {
                    thumbnail = thumbnail.startsWith('//') ? 'https:' + thumbnail : this.baseURL + thumbnail;
                }

                results.push({
                    title,
                    url,
                    thumbnail,
                    quality: item.find('.gmr-quality-item').text().trim()
                });
            });
            return { success: true, results };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    async getDetail(url) {
        try {
            const response = await axios.get(url, { headers: this.headers });
            const $ = cheerio.load(response.data);

            const detail = {
                title: $('.entry-title').text().trim(),
                description: $('.entry-content p').first().text().trim(),
                thumbnail: $('.gmr-movie-data figure img').attr('data-lazy-src') || $('.gmr-movie-data figure img').attr('src'),
                metadata: {},
                servers: [],
                relatedMovies: [],
                trailerUrl: $('a.gmr-trailer-popup').attr('href')
            };

            // Metadata info
            $('.gmr-moviedata').each((i, el) => {
                const text = $(el).text();
                if (text.includes('Genre')) detail.metadata.genres = $(el).find('a').map((i, e) => $(e).text()).get();
                if (text.includes('Duration')) detail.metadata.duration = $(el).text().replace('Duration:', '').trim();
                if (text.includes('Quality')) detail.metadata.quality = $(el).find('a').text().trim();
                if (text.includes('Year')) detail.metadata.year = $(el).find('a').text().trim();
            });

            // Get Stream Links (Tabs)
            $('.muvipro-player-tabs li a').each((i, el) => {
                detail.servers.push({
                    name: $(el).text().trim(),
                    id: $(el).attr('href') // Biasanya ID tab
                });
            });

            // Related Movies
            $('.gmr-grid.idmuvi-core .item').each((i, el) => {
                const $el = $(el);
                detail.relatedMovies.push({
                    title: $el.find('.entry-title a').text().trim(),
                    url: $el.find('.entry-title a').attr('href'),
                    thumbnail: $el.find('img').attr('data-lazy-src') || $el.find('img').attr('src')
                });
            });

            return { success: true, detail };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }
}

// --- API ROUTES ---
const scraper = new KlikXXIScraper();

app.get('/api/home', async (req, res) => {
    const data = await scraper.getHome();
    res.json(data);
});

app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    const data = await scraper.search(q);
    res.json(data);
});

app.get('/api/detail', async (req, res) => {
    const { url } = req.query;
    const data = await scraper.getDetail(url);
    res.json(data);
});

module.exports = app;
