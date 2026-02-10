const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// --- KODE SCRAPER ANDA (DIINTEGRASIKAN) ---
class KlikXXIScraper {
    constructor() {
        this.baseURL = 'https://klikxxi.me';
        this.client = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'navigate'
            }
        });
    }

    // Fungsi Helper dari kode Anda
    extractYear(title) {
        const match = title.match(/\b(19|20)\d{2}\b/);
        return match ? match[0] : null;
    }

    extractQualityFromText(text) {
        const qualities = ['1080', '720', '480', '360', 'HD', 'HDTS', 'WEB-DL', 'BluRay'];
        for (const quality of qualities) {
            if (text.includes(quality)) {
                return quality;
            }
        }
        return 'HD';
    }

    // Fungsi Parsing (Dipakai untuk Search & Home)
    parseList($, results) {
        $('#gmr-main-load .item-infinite').each((index, element) => {
            const item = $(element);
            const title = item.find('.entry-title a').text().trim();
            const url = item.find('.entry-title a').attr('href');
            // Fix URL Gambar (kadang sudah http, kadang relative)
            let rawThumb = item.find('img').attr('data-lazy-src') || item.find('img').attr('src');
            let thumbnail = rawThumb;
            if (rawThumb && !rawThumb.startsWith('http')) {
                thumbnail = this.baseURL + rawThumb;
            }

            const rating = item.find('.gmr-rating-item').text().trim();
            const duration = item.find('.gmr-duration-item').text().trim();
            const quality = item.find('.gmr-quality-item').text().trim();
            
            const trailerBtn = item.find('.gmr-trailer-popup');
            const trailerUrl = trailerBtn.length ? trailerBtn.attr('href') : null;

            if(title && url) {
                results.push({
                    title,
                    url,
                    thumbnail,
                    rating: rating.replace('icon_star', '').trim(),
                    duration,
                    quality,
                    trailerUrl,
                    year: this.extractYear(title)
                });
            }
        });
    }

    // TAMBAHAN: Get Home (Menggunakan logika yg sama dgn Search agar Home muncul)
    async getHome() {
        try {
            const response = await this.client.get(`${this.baseURL}/`);
            const $ = cheerio.load(response.data);
            const results = [];
            this.parseList($, results);
            return { success: true, results };
        } catch (e) {
            console.error("Home Error:", e.message);
            return { success: false, message: e.message };
        }
    }

    // Kode Search Anda
    async search(query) {
        try {
            const params = new URLSearchParams();
            params.append('s', query);
            params.append('post_type[]', 'post');
            params.append('post_type[]', 'tv');
            const response = await this.client.get(`${this.baseURL}/`, { params });
            const $ = cheerio.load(response.data);
            const results = [];
            this.parseList($, results);
            return { success: true, query, total_results: results.length, results };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // Kode GetDetail Anda
    async getDetail(url) {
        try {
            const response = await this.client.get(url);
            const $ = cheerio.load(response.data);
            
            let thumbRaw = $('.gmr-movie-data figure img').attr('data-lazy-src') || $('.gmr-movie-data figure img').attr('src');
            let thumbnail = thumbRaw;
             if (thumbRaw && !thumbRaw.startsWith('http')) {
                thumbnail = this.baseURL + thumbRaw;
            }

            const detail = {
                title: $('.entry-title').text().trim(),
                thumbnail: thumbnail,
                rating: {
                    value: $('.gmr-meta-rating span[itemprop="ratingValue"]').text().trim(),
                    votes: $('.gmr-meta-rating span[itemprop="ratingCount"]').text().trim()
                },
                description: $('.entry-content p').first().text().trim(),
                metadata: {},
                downloadLinks: [],
                relatedMovies: [],
                servers: []
            };

            $('.gmr-moviedata').each((i, el) => {
                const $el = $(el);
                const label = $el.find('strong').text().replace(':', '').trim().toLowerCase();
                // Parsing metadata sederhana
                if(label.includes('genre')) detail.metadata.genres = $el.find('a').map((i,e)=>$(e).text()).get();
                if(label.includes('duration')) detail.metadata.duration = $el.text().replace('Duration','').replace(':','').trim();
                if(label.includes('quality')) detail.metadata.quality = $el.find('a').text().trim();
                if(label.includes('year')) detail.metadata.year = $el.find('a').text().trim();
            });

            // Related
            $('.gmr-grid.idmuvi-core .item').each((i, el) => {
                const $el = $(el);
                let relThumb = $el.find('img').attr('data-lazy-src') || $el.find('img').attr('src');
                if(relThumb && !relThumb.startsWith('http')) relThumb = this.baseURL + relThumb;

                detail.relatedMovies.push({
                    title: $el.find('.entry-title a').text().trim(),
                    url: $el.find('.entry-title a').attr('href'),
                    thumbnail: relThumb,
                    year: this.extractYear($el.find('.entry-title a').text().trim())
                });
            });

            // Servers (Tab ID)
            $('.muvipro-player-tabs li a').each((i, el) => {
                const $el = $(el);
                detail.servers.push({
                    name: $el.text().trim(),
                    id: $el.attr('id'),
                    tabId: $el.attr('href')
                });
            });

            const trailerBtn = $('a.gmr-trailer-popup[title*="Trailer"]');
            if (trailerBtn.length) detail.trailerUrl = trailerBtn.attr('href');

            return { success: true, url, detail };
        } catch (e) {
            console.error(e);
            return { success: false, message: e.message };
        }
    }
}

// --- SETUP ROUTE EXPRESS ---
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
