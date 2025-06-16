// backend/server.js
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

/* ----------  App init ---------- */
const app  = express();
const PORT = process.env.PORT || 5000;

/* ----------  Required env check ---------- */
['MONGO_URI', 'JWT_SECRET', 'NEWS_API_KEY'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
});

/* ----------  Middleware ---------- */
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], // adjust for your front‑end ports
  credentials: true
}));
app.use(express.json());

/* ----------  DB ---------- */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch((err) => { console.error('❌ MongoDB error', err); process.exit(1); });

/* ----------  Routes ---------- */
const { router: authRoutes } = require('./auth2');
const newsRoutes             = require('./news');

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);

/* ----------  Root ---------- */
app.get('/', (req, res) => res.send('📰 News API up & running'));

/* ----------  Central error handler ---------- */
app.use((err, req, res, _next) => {
  console.error('💥', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

/* ----------  Start ---------- */
app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));

process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled rejection', err);
  process.exit(1);
});
