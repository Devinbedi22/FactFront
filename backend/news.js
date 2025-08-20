const express  = require('express');
const fetch    = require('node-fetch');
const mongoose = require('mongoose');
require('dotenv').config();

const router = express.Router();


const historySchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  query:    { type: String, required: true },
  date:     { type: Date, default: Date.now },
  articles: [
    {
      title: String,
      url:   String
    }
  ]
});

const History = mongoose.model('History', historySchema);


const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Login required' });
  }
  next();
};


let cache = { ts: 0, articles: [] };
const ONE_HOUR = 60 * 60 * 1000;

router.get('/headlines', async (req, res, next) => {
  try {
    if (Date.now() - cache.ts < ONE_HOUR) {
      return res.json({ articles: cache.articles });
    }

    const apiKey = process.env.NEWS_API_KEY;
    const url    = `https://newsapi.org/v2/top-headlines?language=en&apiKey=${apiKey}`;

    const raw    = await fetch(url);
    const data   = await raw.json();

    if (!raw.ok || data.status !== 'ok') {
      return res.status(raw.status).json({ error: data.message || 'NewsAPI error' });
    }

    cache = { ts: Date.now(), articles: data.articles };
    res.json({ articles: cache.articles });
  } catch (err) {
    next(err);
  }
});



router.get('/search', requireLogin, async (req, res, next) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.status(400).json({ error: 'Query (q) parameter required' });

    const apiKey = process.env.NEWS_API_KEY;
    const url    = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&apiKey=${apiKey}`;

    const raw    = await fetch(url);
    const data   = await raw.json();

    if (!raw.ok || data.status !== 'ok') {
      return res.status(raw.status).json({ error: data.message || 'NewsAPI error' });
    }

    res.json(data); 
  } catch (err) {
    next(err);
  }
});


router.post('/search', requireLogin, async (req, res, next) => {
  try {
    const { query, articles } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    await new History({
      userId: req.session.userId,
      query,
      articles: Array.isArray(articles) ? articles : []
    }).save();

    res.json({ message: 'Search saved with articles' });
  } catch (err) {
    next(err);
  }
});


router.get('/history', requireLogin, async (req, res, next) => {
  try {
    const history = await History.find({ userId: req.session.userId })
                                 .sort({ date: -1 })
                                 .limit(10);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
