// backend/auth2.js
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const router = express.Router();

/* ----------  User model ---------- */
const userSchema = new mongoose.Schema({
  username : { type: String, required: true, unique: true, trim: true, minlength: 3 },
  password : { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

/* ----------  Helpers ---------- */
const issueToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '2h' });

/* ----------  /signup ---------- */
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

/* ----------  /login ---------- */
router.post('/login', async (req, res, next) => {
  try {
    const { username = '', password = '' } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username & password are required' });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ token: issueToken(user._id) });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, User };
