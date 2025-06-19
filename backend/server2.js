// backend/server2.js
const express       = require('express');
const cors          = require('cors');
const mongoose      = require('mongoose');
const session       = require('express-session');
const MongoStore    = require('connect-mongo');
const path          = require('path');
require('dotenv').config();

/* ---------- App init ---------- */
const app  = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

/* ---------- Required env check ---------- */
['MONGO_URI', 'NEWS_API_KEY', 'SESSION_SECRET'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
});

/* ---------- Middleware ---------- */
app.use(cors({
  origin: isProduction
    ? 'https://factfront.onrender.com'
    : ['http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));

app.use(express.json());

/* ---------- Session Setup ---------- */
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
  }),
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction       // must be true if sameSite: 'none'
  }
}));

/* ---------- Serve static frontend (if deployed with frontend folder) ---------- */
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

/* ---------- SPA fallback ---------- */
app.get(/^\/(?!api\/).*/, (_req, res) =>
  res.sendFile(path.join(frontendDir, 'index2.html'))
);

/* ---------- Connect MongoDB ---------- */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

/* ---------- API Routes ---------- */
const { router: authRoutes } = require('./auth2');
const newsRoutes             = require('./news');

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);

/* ---------- Health check ---------- */
app.get('/api', (_req, res) => res.send('📰 News API up & running'));

/* ---------- Central error handler ---------- */
app.use((err, _req, res, _next) => {
  console.error('💥', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

/* ---------- Start server ---------- */
app.listen(PORT, () =>
  console.log(`🚀 Server listening on http://localhost:${PORT}`)
);

/* ---------- Handle unhandled promise rejections ---------- */
process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled rejection:', err);
  process.exit(1);
});
