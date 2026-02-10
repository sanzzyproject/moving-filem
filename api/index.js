const express = require('express');
const cors = require('cors');
const Scraper = require('../lib/scraper');

const app = express();
const scraper = new Scraper();

app.use(cors());
app.use(express.json());

// Route: Trending / Home
app.get('/api/home', async (req, res) => {
    const data = await scraper.getHome();
    res.json(data);
});

// Route: Search
app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
    const data = await scraper.search(q);
    res.json(data);
});

// Route: Detail
app.get('/api/detail', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Url parameter is required' });
    const data = await scraper.getDetail(url);
    res.json(data);
});

module.exports = app;
