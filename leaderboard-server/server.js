require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initializeDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const leaderboardRoutes = require('./routes/leaderboard');
const usersRoutes = require('./routes/users');
const activitiesRoutes = require('./routes/activities');
const referralsRoutes = require('./routes/referrals');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || 'https://projectdivido.com';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initializeDatabase();

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Divido Leaderboard API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/ref/:code', (req, res) => {
  const referralCode = req.params.code;
  res.redirect(`${APP_URL}?ref=${referralCode}`);
});

app.get('/register', (req, res) => {
  const referralCode = req.query.ref;
  if (referralCode) {
    res.redirect(`${APP_URL}?ref=${referralCode}`);
  } else {
    res.redirect(APP_URL);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/referrals', referralsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Referral links will redirect to: ${APP_URL}`);
});

module.exports = app;
