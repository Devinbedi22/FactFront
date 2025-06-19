// backend/auth2.js
const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();

const router = express.Router();

/* ---------- User model ---------- */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

/* ---------- /signup ---------- */
router.post('/signup', async (req, res, next) => {
  try {
    const { username = '', password = '' } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'Username & password are required' });

    const exists = await User.exists({ username });
    if (exists)
      return res.status(409).json({ error: 'Username already taken' });

    const hashed = await bcrypt.hash(password, 10);
    await new User({ username, password: hashed }).save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    next(err);
  }
});

/* ---------- /login ---------- */
router.post('/login', async (req, res, next) => {
  try {
    const { username = '', password = '' } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username & password are required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // ✅ Store user ID in session
    req.session.userId = user._id;

    res.json({ message: 'Login successful' });
  } catch (err) {
    next(err);
  }
});

/* ---------- /logout ---------- */
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });

    res.clearCookie('sid'); // default session cookie name
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = { router, User };
