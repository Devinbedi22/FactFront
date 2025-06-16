// backend/server2.js
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const path     = require('path');             // NEW
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
  origin: [
    'http://localhost:5500',           // dev served directly
    'http://127.0.0.1:5500',
    process.env.FRONTEND_URL || ''     // add your Render static URL later
  ],
  credentials: true
}));
app.use(express.json());

/* ----------  Serve static frontend ---------- */
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

/* Optional: Single‑page fallback  */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();               // keep API routes
  res.sendFile(path.join(frontendDir, 'index2.html'));
});

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

/* ----------  Root (health check) ---------- */
app.get('/api', (_req, res) => res.send('📰 News API up & running'));

/* ----------  Central error handler ---------- */
app.use((err, _req, res, _next) => {
  console.error('💥', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

/* ----------  Start ---------- */
app.listen(PORT, () =>
  console.log(`🚀 Server listening on http://localhost:${PORT}`)
);

process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled rejection', err);
  process.exit(1);
});
