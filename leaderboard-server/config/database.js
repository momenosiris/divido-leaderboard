const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './divido_leaderboard.json';

let db = {
  users: [],
  activities: [],
  cache: { id: 1, rankings: [], updated_at: new Date().toISOString() }
};

function loadDatabase() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(data);
    }
  } catch (e) {
    console.log('Starting with fresh database');
  }
}

function saveDatabase() {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function initializeDatabase() {
  loadDatabase();
  
  if (!db.users) db.users = [];
  if (!db.activities) db.activities = [];
  if (!db.cache) db.cache = { id: 1, rankings: [], updated_at: new Date().toISOString() };

  const existingUsers = db.users.filter(u => u.email === 'admin@divido.com');
  if (existingUsers.length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.users.push({
      id: uuidv4(),
      username: 'admin',
      email: 'admin@divido.com',
      password: hashedPassword,
      avatar_url: '',
      points: 0,
      referral_code: 'ADMIN001',
      referred_by: null,
      referrals_count: 0,
      waitlist_position: null,
      joined_date: new Date().toISOString(),
      is_admin: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    console.log('Default admin user created (admin@divido.com / admin123)');
    saveDatabase();
  }

  console.log('Database initialized successfully');
}

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getNextWaitlistPosition() {
  if (db.users.length === 0) return 1;
  const maxPos = Math.max(...db.users.map(u => u.waitlist_position || 0));
  return maxPos + 1;
}

const dbWrapper = {
  prepare: (sql) => ({
    run: (...params) => {
      if (sql.includes('INSERT INTO users') && sql.includes('VALUES (?, ?, ?, ?, ?, ?')) {
        const user = {
          id: params[0],
          username: params[1],
          email: params[2],
          password: params[3],
          avatar_url: params[4],
          points: params[5],
          referral_code: params[6] || generateReferralCode(),
          referred_by: null,
          referrals_count: 0,
          waitlist_position: getNextWaitlistPosition(),
          joined_date: new Date().toISOString(),
          is_admin: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.users.push(user);
        saveDatabase();
        return { changes: 1 };
      }
      if (sql.includes('DELETE FROM users')) {
        const count = db.users.length;
        db.users = [];
        db.activities = [];
        saveDatabase();
        return { changes: count };
      }
      if (sql.includes('DELETE FROM activities')) {
        const count = db.activities.length;
        db.activities = [];
        saveDatabase();
        return { changes: count };
      }
      if (sql.includes('INSERT INTO activities')) {
        const activity = {
          id: params[0],
          user_id: params[1],
          activity_type: params[2],
          points_earned: params[3],
          description: params[4],
          created_at: new Date().toISOString()
        };
        db.activities.push(activity);
        saveDatabase();
        return { changes: 1 };
      }
      if (sql.includes('UPDATE users SET referrals_count')) {
        const user = db.users.find(u => u.referral_code === params[1]);
        if (user) {
          user.referrals_count = params[0];
          user.updated_at = new Date().toISOString();
          saveDatabase();
        }
        return { changes: 1 };
      }
      if (sql.includes('UPDATE users SET points = points +')) {
        const user = db.users.find(u => u.id === params[1]);
        if (user) {
          user.points += params[0];
          user.updated_at = new Date().toISOString();
          saveDatabase();
        }
        return { changes: 1 };
      }
      if (sql.includes('UPDATE users SET is_admin = 1')) {
        const user = db.users.find(u => u.email === params[0]);
        if (user) {
          user.is_admin = 1;
          saveDatabase();
        }
        return { changes: 1 };
      }
      return { changes: 0 };
    },
    get: (...params) => {
      if (sql.includes('SELECT name FROM sqlite_master')) {
        return db.users.length > 0 ? { name: 'users' } : undefined;
      }
      if (sql.includes('SELECT MAX(waitlist_position)')) {
        const maxPos = db.users.length > 0 ? Math.max(...db.users.map(u => u.waitlist_position || 0)) : 0;
        return { max_pos: maxPos };
      }
      if (sql.includes('SELECT * FROM users WHERE email')) {
        return db.users.find(u => u.email === params[0]);
      }
      if (sql.includes('SELECT * FROM users WHERE id')) {
        return db.users.find(u => u.id === params[0]);
      }
      if (sql.includes('SELECT * FROM users WHERE referral_code')) {
        return db.users.find(u => u.referral_code === params[0]);
      }
      if (sql.includes('SELECT * FROM leaderboard_cache')) {
        return db.cache;
      }
      if (sql.includes('SELECT COUNT(*)')) {
        return { count: db.users.length };
      }
      if (sql.includes('SELECT points FROM users WHERE id')) {
        return db.users.find(u => u.id === params[0]) || { points: 0 };
      }
      if (sql.includes('SELECT COUNT(*) as rank FROM users WHERE points >')) {
        const userPoints = params[0];
        const rank = db.users.filter(u => u.points > userPoints).length;
        return { rank };
      }
      if (sql.includes('SELECT waitlist_position FROM users WHERE id')) {
        const user = db.users.find(u => u.id === params[0]);
        return user ? { waitlist_position: user.waitlist_position } : null;
      }
      return undefined;
    },
    all: (...params) => {
      if (sql.includes('RANK() OVER')) {
        const sorted = [...db.users].sort((a, b) => b.points - a.points).slice(0, params[1] || 10);
        return sorted.map((u, i) => ({ username: u.username, points: u.points, rank: i + 1 }));
      }
      if (sql.includes('ORDER BY points DESC')) {
        return [...db.users].sort((a, b) => b.points - a.points).slice(0, params[0] || 100);
      }
      if (sql.includes('ORDER BY waitlist_position ASC')) {
        return [...db.users].sort((a, b) => (a.waitlist_position || 999) - (b.waitlist_position || 999)).slice(0, params[0] || 100);
      }
      if (sql.includes('ORDER BY referrals_count DESC')) {
        return [...db.users].filter(u => u.referrals_count > 0).sort((a, b) => b.referrals_count - a.referrals_count).slice(0, params[0] || 100);
      }
      if (sql.includes('WHERE referred_by =')) {
        return db.users.filter(u => u.referred_by === params[0]);
      }
      return [];
    }
  }),
  exec: (sql) => {
    if (sql.includes('CREATE TABLE')) {
      saveDatabase();
    }
  }
};

module.exports = { db: dbWrapper, initializeDatabase };
