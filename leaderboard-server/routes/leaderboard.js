const express = require('express');
const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 100);
    const offset = (page - 1) * limit;

    const users = Leaderboard.getTopUsers(limit, offset);
    const totalUsers = Leaderboard.getTotalUsers();
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      leaderboard: users.map((user, index) => ({
        rank: offset + index + 1,
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        points: user.points,
        referrals_count: user.referrals_count || 0,
        referred_by: user.referred_by,
        referral_code: user.referral_code,
        waitlist_position: user.waitlist_position,
        created_at: user.created_at
      })),
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/waitlist', (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 100);
    const offset = (page - 1) * limit;

    const users = User.getWaitlist(limit, offset);
    const totalUsers = User.getTotalCount();
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      waitlist: users.map((user, index) => ({
        position: user.waitlist_position,
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        points: user.points,
        referrals_count: user.referrals_count,
        joined_date: user.joined_date
      })),
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/my-position', authMiddleware, (req, res, next) => {
  try {
    const result = User.getUserWaitlistPosition(req.user.id);

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      position: result.position,
      totalUsers: result.totalUsers,
      progress: ((result.totalUsers - result.position) / result.totalUsers * 100).toFixed(1)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/referrals', (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100);
    const topReferrers = User.getTopReferrers(limit);
    const totalUsers = User.getTotalCount();

    res.json({
      topReferrers: topReferrers.map((user, index) => ({
        rank: index + 1,
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        referrals_count: user.referrals_count,
        waitlist_position: user.waitlist_position,
        joined_date: user.joined_date
      })),
      totalUsers
    });
  } catch (error) {
    next(error);
  }
});

router.get('/user/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const result = Leaderboard.getUserRank(id);

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = User.findById(id);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        points: user.points,
        created_at: user.created_at
      },
      rank: result.rank,
      totalUsers: Leaderboard.getTotalUsers()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/my-rank', authMiddleware, (req, res, next) => {
  try {
    const result = Leaderboard.getUserRank(req.user.id);

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: req.user,
      rank: result.rank,
      totalUsers: Leaderboard.getTotalUsers()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
