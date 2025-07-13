
const express       = require('express');
const cors          = require('cors');
const mongoose      = require('mongoose');
const session       = require('express-session');
const MongoStore    = require('connect-mongo');
const path          = require('path');
require('dotenv').config();


const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';


['MONGO_URI', 'NEWS_API_KEY', 'SESSION_SECRET'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
});


app.use(cors({
  origin: 'https://factfront.onrender.com',
  credentials: true
}));


app.use(express.json());


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
    maxAge: 1000 * 60 * 60 * 2, 
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction       
  }
}));


const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));


app.get(/^\/(?!api\/).*/, (_req, res) =>
  res.sendFile(path.join(frontendDir, 'index2.html'))
);


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });


const { router: authRoutes } = require('./auth2');
const newsRoutes             = require('./news');

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);


app.get('/api', (_req, res) => res.send('📰 News API up & running'));


app.use((err, _req, res, _next) => {
  console.error('💥', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});


app.listen(PORT, () =>
  console.log(`🚀 Server listening on http://localhost:${PORT}`)
);


process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled rejection:', err);
  process.exit(1);
});
