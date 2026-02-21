const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const APP_URL = process.env.APP_URL || 'https://projectdivido.com';

router.get('/dashboard', authMiddleware, (req, res, next) => {
  try {
    const user = User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const referredUsers = User.getReferredUsers(user.referral_code);

    res.json({
      totalReferrals: referredUsers.length,
      pendingRewards: 0,
      availableBalance: 0,
      referralCode: user.referral_code,
      referralLink: `${APP_URL}?ref=${user.referral_code}`,
      referrals: referredUsers.map(u => ({
        id: u.id,
        username: u.username,
        status: 'active',
        reward: 1000,
        joined_at: u.joined_date
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/my-code', authMiddleware, (req, res, next) => {
  try {
    const user = User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      referral_code: user.referral_code,
      referral_link: `${APP_URL}?ref=${user.referral_code}`
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', authMiddleware, (req, res, next) => {
  try {
    const stats = User.getReferralStats(req.user.id);

    if (!stats) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalUsers = User.getTotalCount();
    const positionAhead = stats.waitlist_position > 1 ? stats.waitlist_position - 1 : 0;
    const progress = totalUsers > 0 ? ((totalUsers - stats.waitlist_position) / totalUsers * 100).toFixed(1) : '0';

    res.json({
      referral_code: stats.referral_code,
      referral_link: `${APP_URL}?ref=${stats.referral_code}`,
      referrals_count: stats.referrals_count,
      referred_by: stats.referred_by,
      referrer: stats.referrer,
      waitlist_position: stats.waitlist_position,
      joined_date: stats.joined_date,
      total_users: totalUsers,
      position_ahead: positionAhead,
      progress: progress
    });
  } catch (error) {
    next(error);
  }
});

router.post('/validate/:code', (req, res, next) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ valid: false, error: 'Referral code is required' });
    }

    const user = User.findByReferralCode(code.toUpperCase());

    if (!user) {
      return res.status(404).json({ valid: false, error: 'Invalid referral code' });
    }

    res.json({
      valid: true,
      referrer: {
        username: user.username,
        referrals_count: user.referrals_count
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
