const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Check required environment variables
if (!process.env.MONGO_URI || !process.env.JWT_SECRET || !process.env.NEWS_API_KEY) {
  console.error('❌ Missing one or more required environment variables (MONGO_URI, JWT_SECRET, NEWS_API_KEY)');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Routes
const authRoutes = require('./auth2');
const newsRoutes = require('./news');

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);

// Root Route
app.get('/', (req, res) => {
  res.send('📰 News App API is running');
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});

// Optional: Graceful error handling
process.on('unhandledRejection', err => {
  console.error('❗ Unhandled rejection:', err);
  process.exit(1);
});
