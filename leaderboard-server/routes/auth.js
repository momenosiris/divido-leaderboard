const express = require('express');
const User = require('../models/User');

const router = express.Router();

router.post('/register', (req, res, next) => {
  try {
    const { username, email, password, avatar_url, referral_code } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const existingEmail = User.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const existingUsername = User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = User.create(username, email, password, avatar_url, referral_code);
    const token = User.generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!User.verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = User.generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        points: user.points,
        referral_code: user.referral_code,
        waitlist_position: user.waitlist_position,
        is_admin: user.is_admin
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
