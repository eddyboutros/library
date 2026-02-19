require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { usersStore } = require('./services/excel');
const { initOpenAI } = require('./services/ai');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const chapterRoutes = require('./routes/chapters');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.CLIENT_URL || true)
  : (process.env.CLIENT_URL || 'http://localhost:5173');
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ─── Passport Google OAuth ───
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const defaultCallback = process.env.RENDER_EXTERNAL_URL
    ? `${process.env.RENDER_EXTERNAL_URL}/api/auth/google/callback`
    : 'http://localhost:3001/api/auth/google/callback';

  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || defaultCallback,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = usersStore.findOne(u => u.provider === 'google' && u.providerId === profile.id);

        if (!user) {
          user = usersStore.findOne(u => u.email === profile.emails?.[0]?.value);
        }

        if (!user) {
          user = await usersStore.create({
            name: profile.displayName,
            email: profile.emails?.[0]?.value || '',
            password: '',
            role: 'member',
            provider: 'google',
            providerId: profile.id,
            avatar: profile.photos?.[0]?.value || null,
            isActive: true,
            theme: 'light',
            lastLogin: new Date().toISOString(),
          });
        } else {
          await usersStore.update(user.id, {
            lastLogin: new Date().toISOString(),
            avatar: user.avatar || profile.photos?.[0]?.value || null,
            provider: 'google',
            providerId: profile.id,
          });
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  ));
  console.log('  Google OAuth configured');
}

app.use(passport.initialize());

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/search', searchRoutes);

// ─── Serve React app in production ───
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// ─── Health check ───
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start ───
async function start() {
  console.log('\n📚 Library Management System');
  console.log('─'.repeat(40));

  const seed = require('./seed');
  await seed();

  initOpenAI();

  app.listen(PORT, () => {
    console.log(`\n  Server running on http://localhost:${PORT}`);
    console.log(`  API docs: http://localhost:${PORT}/api/health`);
    console.log('─'.repeat(40) + '\n');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
