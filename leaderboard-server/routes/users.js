const express = require('express');
const User = require('../models/User');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const users = User.getLeaderboard(100, 0);
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
