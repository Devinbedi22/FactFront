const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

// Schema for search history
const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  query: String,
  date: { type: Date, default: Date.now }
});

const History = mongoose.model('History', historySchema);

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// 🔹 HEADLINES with caching (no login required)
let cachedHeadlines = null;
let lastFetched = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

router.get('/headlines', async (req, res) => {
  const now = Date.now();

  try {
    if (cachedHeadlines && now - lastFetched < CACHE_DURATION) {
      return res.json({ articles: cachedHeadlines });
    }

    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing API key' });

    const url = `https://newsapi.org/v2/top-headlines?language=en&apiKey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.status !== 'ok') {
      return res.status(response.status).json({ error: data.message || 'NewsAPI error' });
    }

    // Cache the response
    cachedHeadlines = data.articles;
    lastFetched = now;

    res.json({ articles: cachedHeadlines });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch headlines', details: err.message });
  }
});

// 🔹 Search Route (requires login)
router.get('/search', verifyToken, async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query parameter required' });

  try {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing API key' });

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.status !== 'ok') {
      return res.status(response.status).json({ error: data.message || 'NewsAPI error' });
    }

    // Save to history
    await new History({ userId: req.userId, query }).save();

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

// 🔹 Get user search history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const history = await History.find({ userId: req.userId }).sort({ date: -1 }).limit(10);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
