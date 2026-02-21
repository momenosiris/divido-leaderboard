const express = require('express');
const Activity = require('../models/Activity');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const activities = Activity.getAll(100, 0);
    res.json({ activities });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
