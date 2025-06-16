// backend/news.js
const express = require('express');
const fetch   = require('node-fetch');
const jwt     = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const router = express.Router();

/* ----------  History model ---------- */
const historySchema = new mongoose.Schema({
  userId : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  query  : { type: String, required: true },
  date   : { type: Date,   default: Date.now }
});
const History = mongoose.model('History', historySchema);

/* ----------  JWT middleware ---------- */
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/* ----------  HEADLINES (cached) ---------- */
let cache = { ts: 0, articles: [] };
const ONE_HOUR = 60 * 60 * 1000;

router.get('/headlines', async (req, res, next) => {
  try {
    if (Date.now() - cache.ts < ONE_HOUR) return res.json({ articles: cache.articles });

    const apiKey = process.env.NEWS_API_KEY;
    const url    = `https://newsapi.org/v2/top-headlines?language=en&apiKey=${apiKey}`;

    const raw    = await fetch(url);
    const data   = await raw.json();

    if (!raw.ok || data.status !== 'ok')
      return res.status(raw.status).json({ error: data.message || 'NewsAPI error' });

    cache = { ts: Date.now(), articles: data.articles };
    res.json({ articles: cache.articles });
  } catch (err) {
    next(err);
  }
});

/* ----------  SEARCH (requires login) ---------- */
router.get('/search', verifyToken, async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.status(400).json({ error: 'Query (q) parameter required' });

    const apiKey = process.env.NEWS_API_KEY;
    const url    = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&apiKey=${apiKey}`;

    const raw    = await fetch(url);
    const data   = await raw.json();

    if (!raw.ok || data.status !== 'ok')
      return res.status(raw.status).json({ error: data.message || 'NewsAPI error' });

    // save history
    await new History({ userId: req.userId, query: q }).save();

    res.json(data);
  } catch (err) {
    next(err);
  }
});

/* ----------  HISTORY (requires login) ---------- */
router.get('/history', verifyToken, async (req, res, next) => {
  try {
    const history = await History.find({ userId: req.userId })
                                 .sort({ date: -1 })
                                 .limit(10);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
