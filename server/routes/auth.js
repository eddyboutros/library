const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { usersStore } = require('../services/excel');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = usersStore.findOne(u => u.email === email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await usersStore.create({
      name,
      email,
      password: hashedPassword,
      role: 'member',
      provider: 'local',
      providerId: null,
      avatar: null,
      isActive: true,
      theme: 'light',
      lastLogin: new Date().toISOString(),
    });

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = usersStore.findOne(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await usersStore.update(user.id, { lastLogin: new Date().toISOString() });

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  const { password, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { name, avatar, theme } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;
    if (theme && (theme === 'light' || theme === 'dark')) updates.theme = theme;

    const updated = await usersStore.update(req.user.id, updates);
    const { password, ...safeUser } = updated;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// Google OAuth
const googleNotConfigured = { error: 'Google SSO is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env' };

router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json(googleNotConfigured);
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=sso_not_configured`);
    }
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=sso_failed` })(req, res, next);
  },
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
  }
);

// Demo login: quick access with pre-seeded accounts
router.post('/demo', async (req, res) => {
  try {
    const { role } = req.body;
    const demoEmails = {
      admin: 'admin@library.com',
      librarian: 'librarian@library.com',
      member: 'member@library.com',
    };

    const email = demoEmails[role];
    if (!email) {
      return res.status(400).json({ error: 'Invalid demo role. Use: admin, librarian, or member' });
    }

    const user = usersStore.findOne(u => u.email === email);
    if (!user) {
      return res.status(404).json({ error: 'Demo account not found. Run seed first.' });
    }

    await usersStore.update(user.id, { lastLogin: new Date().toISOString() });

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Demo login failed', details: err.message });
  }
});

router.get('/sso-status', (_req, res) => {
  res.json({
    google: !!process.env.GOOGLE_CLIENT_ID,
    ai: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key',
  });
});

module.exports = router;
