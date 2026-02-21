const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'divido_secret_key_2024';

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class User {
  static create(username, email, password, avatar_url = '', referral_code = null) {
    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userReferralCode = generateReferralCode();
    
    let referredBy = null;
    if (referral_code) {
      const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referral_code);
      if (referrer) {
        referredBy = referral_code;
        db.prepare('UPDATE users SET referrals_count = referrals_count + 1 WHERE referral_code = ?').run(referral_code);
      }
    }

    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password, avatar_url, points, referral_code, referred_by, referrals_count, waitlist_position)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, 1)
    `);

    stmt.run(id, username, email, hashedPassword, avatar_url || '', userReferralCode, referredBy);

    return {
      id,
      username,
      email,
      avatar_url: avatar_url || '',
      points: 0,
      referral_code: userReferralCode,
      referred_by: referredBy,
      referrals_count: 0,
      waitlist_position: 1,
      joined_date: new Date().toISOString()
    };
  }

  static findById(id) {
    return db.prepare(`
      SELECT id, username, email, avatar_url, points, referral_code, referred_by, referrals_count, waitlist_position, joined_date, created_at, updated_at
      FROM users WHERE id = ?
    `).get(id);
  }

  static findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  static findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  static findByReferralCode(code) {
    return db.prepare('SELECT * FROM users WHERE referral_code = ?').get(code);
  }

  static getTotalCount() {
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return result.count;
  }

  static getLeaderboard(limit = 100, offset = 0) {
    return db.prepare(`
      SELECT id, username, email, avatar_url, points, created_at
      FROM users
      ORDER BY points DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }

  static getUserRank(userId) {
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
    if (!user) return null;

    const rank = db.prepare(`
      SELECT COUNT(*) as rank FROM users WHERE points > ?
    `).get(user.points);

    return rank.rank + 1;
  }

  static getWaitlist(limit = 100, offset = 0) {
    return db.prepare(`
      SELECT id, username, email, avatar_url, points, referral_code, referrals_count, waitlist_position, joined_date, created_at
      FROM users
      ORDER BY waitlist_position ASC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }

  static getUserWaitlistPosition(userId) {
    const user = db.prepare('SELECT waitlist_position FROM users WHERE id = ?').get(userId);
    if (!user) return null;

    return {
      position: user.waitlist_position,
      totalUsers: User.getTotalCount()
    };
  }

  static getTopReferrers(limit = 100) {
    return db.prepare(`
      SELECT id, username, email, avatar_url, referrals_count, waitlist_position, joined_date
      FROM users
      WHERE referrals_count > 0
      ORDER BY referrals_count DESC, waitlist_position ASC
      LIMIT ?
    `).all(limit);
  }

  static getReferralStats(userId) {
    const user = db.prepare(`
      SELECT referral_code, referrals_count, referred_by, waitlist_position, joined_date
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) return null;

    let referrer = null;
    if (user.referred_by) {
      referrer = db.prepare('SELECT username, referral_code FROM users WHERE referral_code = ?').get(user.referred_by);
    }

    return {
      referral_code: user.referral_code,
      referrals_count: user.referrals_count,
      referred_by: user.referred_by,
      referrer: referrer,
      waitlist_position: user.waitlist_position,
      joined_date: user.joined_date
    };
  }

  static verifyPassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
  }

  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static getReferredUsers(referralCode) {
    return db.prepare(`
      SELECT id, username, email, avatar_url, referral_code, referred_by, referrals_count, joined_date
      FROM users
      WHERE referred_by = ?
      ORDER BY joined_date DESC
    `).all(referralCode);
  }
}

module.exports = User;
