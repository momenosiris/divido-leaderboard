const { db, initializeDatabase } = require('./config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const egyptianNames = [
  { firstName: 'أحمد', lastName: 'محمد' },
  { firstName: 'محمد', lastName: 'علي' },
  { firstName: 'كريم', lastName: 'سليمان' },
  { firstName: 'يوسف', lastName: 'إبراهيم' },
  { firstName: 'عمر', lastName: 'خالد' },
  { firstName: 'علي', lastName: 'حسين' },
  { firstName: 'إسلام', lastName: 'حمدي' },
  { firstName: 'خالد', lastName: 'ناجي' },
  { firstName: 'سامي', lastName: 'فاروق' },
  { firstName: 'تامر', lastName: 'جلال' }
];

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function createUser(nameObj, index) {
  const id = uuidv4();
  const username = `${nameObj.firstName}${nameObj.lastName}${index}`;
  const email = `${username.toLowerCase()}@example.com`;
  const password = bcrypt.hashSync('password123', 10);
  const points = index <= 3 ? 3000 : Math.floor(Math.random() * 2000);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  const referralCode = generateReferralCode();
  
  const user = {
    id,
    username,
    email,
    password,
    avatar_url: avatarUrl,
    points,
    referral_code: referralCode,
    referred_by: null,
    referrals_count: 0,
    waitlist_position: index,
    joined_date: new Date().toISOString(),
    is_admin: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.users.push(user);
  return user;
}

function seedDatabase() {
  console.log('Initializing database...');
  initializeDatabase();
  
  console.log('Clearing existing data...');
  db.users = [];
  db.activities = [];
  
  console.log('Creating 10 Egyptian users...');
  const users = [];
  for (let i = 0; i < egyptianNames.length; i++) {
    const userData = createUser(egyptianNames[i], i + 1);
    users.push(userData);
    console.log(`Created user ${i + 1}/10: ${userData.username} with ${userData.points} points`);
  }
  
  console.log('\nSetting up 3 referrals...');
  const referrer = users[0];
  const referred = [users[1], users[2], users[3]];
  
  referred.forEach(ref => {
    ref.referred_by = referrer.referral_code;
    ref.points += 100;
    console.log(`User ${ref.username} referred by ${referrer.username}`);
  });
  
  referrer.referrals_count = 3;
  console.log(`${referrer.username} now has 3 referrals`);
  
  console.log('\nAdding 3000 EGP reward activity to top 3 users...');
  users.slice(0, 3).forEach(user => {
    user.points += 3000;
    db.activities.push({
      id: uuidv4(),
      user_id: user.id,
      activity_type: 'reward_egp',
      points_earned: 3000,
      description: '3000 EGP Reward Given',
      created_at: new Date().toISOString()
    });
    console.log(`Added 3000 EGP reward to ${user.username}`);
  });
  
  const fs = require('fs');
  fs.writeFileSync('./divido_leaderboard.json', JSON.stringify(db, null, 2));
  
  console.log('\n--- Seed Summary ---');
  console.log(`Users created: ${users.length}`);
  console.log(`Total referrals: 3`);
  console.log(`Top 3 users received 3000 EGP rewards`);
  
  const leaderboard = [...users].sort((a, b) => b.points - a.points);
  
  console.log('\n--- Top 10 Leaderboard ---');
  leaderboard.forEach((user, index) => {
    console.log(`#${index + 1} ${user.username}: ${user.points} points`);
  });
  
  console.log('\nSeed completed successfully!');
}

seedDatabase();
