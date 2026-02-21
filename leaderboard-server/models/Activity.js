const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Activity {
  static create(userId, activityType, pointsEarned, description) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO activities (id, user_id, activity_type, points_earned, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, activityType, pointsEarned, description);
    return { id, user_id: userId, activity_type: activityType, points_earned: pointsEarned, description };
  }

  static getByUserId(userId, limit = 50) {
    return db.prepare(`
      SELECT * FROM activities
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);
  }

  static getAll(limit = 100, offset = 0) {
    return db.prepare(`
      SELECT * FROM activities
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }
}

module.exports = Activity;
