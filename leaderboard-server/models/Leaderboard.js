const { db } = require('../config/database');

class Leaderboard {
  static getTopUsers(limit = 100, offset = 0) {
    return db.prepare(`
      SELECT id, username, email, avatar_url, points, referral_code, referrals_count, waitlist_position, created_at
      FROM users
      ORDER BY points DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }

  static getTotalUsers() {
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return result.count;
  }

  static getUserRank(userId) {
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
    if (!user) return null;

    const rank = db.prepare(`
      SELECT COUNT(*) as rank FROM users WHERE points > ?
    `).get(user.points);

    return {
      rank: rank.rank + 1,
      points: user.points
    };
  }

  static getRankingsAroundUser(userId, range = 5) {
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
    if (!user) return null;

    const users = db.prepare(`
      SELECT id, username, email, avatar_url, points
      FROM users
      ORDER BY points DESC
    `).all();

    const userIndex = users.findIndex(u => u.id === userId);
    const start = Math.max(0, userIndex - range);
    const end = Math.min(users.length, userIndex + range + 1);

    const rankings = users.slice(start, end).map((u, i) => ({
      ...u,
      rank: start + i + 1
    }));

    return {
      rankings,
      userRank: userIndex + 1,
      totalUsers: users.length
    };
  }
}

module.exports = Leaderboard;
