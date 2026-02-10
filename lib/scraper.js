const axios = require('axios');
const cheerio = require('cheerio');

class KlikXXIScraper {
    constructor() {
        this.baseURL = 'https://klikxxi.me';
        this.client = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Referer': 'https://klikxxi.me/'
            }
        });
    }

    // Helper untuk parsing hasil list
    parseList($) {
        const results = [];
        $('#gmr-main-load .item-infinite').each((index, element) => {
            const item = $(element);
            const title = item.find('.entry-title a').text().trim();
            const url = item.find('.entry-title a').attr('href');
            const thumbnail = item.find('img').attr('data-lazy-src') || item.find('img').attr('src');
            const rating = item.find('.gmr-rating-item').text().replace('icon_star', '').trim();
            const duration = item.find('.gmr-duration-item').text().trim();
            const quality = item.find('.gmr-quality-item').text().trim();
            
            results.push({
                title,
                url,
                thumbnail: thumbnail ? (thumbnail.startsWith('http') ? thumbnail : this.baseURL + thumbnail) : null,
                rating,
                duration,
                quality,
                year: title.match(/\b(19|20)\d{2}\b/)?.[0] || 'N/A'
            });
        });
        return results;
    }

    async getHome() {
        try {
            // Mengambil halaman utama untuk rekomendasi/trending
            const response = await this.client.get(this.baseURL);
            const $ = cheerio.load(response.data);
            return { success: true, results: this.parseList($) };
        } catch (e) {
            console.error(e);
            return { success: false, message: e.message };
        }
    }

    async search(query) {
        try {
            const params = new URLSearchParams();
            params.append('s', query);
            params.append('post_type[]', 'post');
            params.append('post_type[]', 'tv');
            const response = await this.client.get(`${this.baseURL}/`, { params });
            const $ = cheerio.load(response.data);
            return { success: true, query, results: this.parseList($) };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    async getDetail(url) {
        try {
            // Pastikan URL valid, jika hanya slug, tambahkan base
            if(!url.includes('http')) url = url; 

            const response = await this.client.get(url);
            const $ = cheerio.load(response.data);
            
            const detail = {
                title: $('.entry-title').text().trim(),
                thumbnail: $('.gmr-movie-data figure img').attr('data-lazy-src') || $('.gmr-movie-data figure img').attr('src'),
                description: $('.entry-content p').first().text().trim(),
                metadata: {},
                downloadLinks: [],
                relatedMovies: [], // Bisa dianggap episode jika series
                servers: [],
                trailerUrl: $('a.gmr-trailer-popup').attr('href') || null
            };

            // Metadata parsing (Genre, Director, etc)
            $('.gmr-moviedata').each((i, el) => {
                const text = $(el).text();
                if(text.includes('Genre')) detail.metadata.genres = $(el).find('a').map((i,e)=>$(e).text()).get();
                if(text.includes('Actor')) detail.metadata.cast = $(el).find('a').map((i,e)=>$(e).text()).get();
                if(text.includes('Director')) detail.metadata.director = $(el).find('a').text();
                if(text.includes('Duration')) detail.metadata.duration = $(el).text().replace('Duration:', '').trim();
            });

            // Servers (Stream links placeholder)
            // Catatan: Scraper ini hanya mengambil nama tab server, bukan direct link video (karena butuh proses AJAX/Token)
            // Kita akan tampilkan listnya di UI.
            $('.muvipro-player-tabs li a').each((i, el) => {
                detail.servers.push({ name: $(el).text().trim(), id: $(el).attr('href') });
            });
            
            // Related / Episodes
            $('.gmr-grid.idmuvi-core .item').each((i, el) => {
                const $el = $(el);
                detail.relatedMovies.push({
                    title: $el.find('.entry-title a').text().trim(),
                    url: $el.find('.entry-title a').attr('href'),
                    thumbnail: $el.find('img').attr('data-lazy-src') || $el.find('img').attr('src'),
                });
            });

            return { success: true, detail };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }
}

module.exports = KlikXXIScraper;
