const express = require('express');
const bcrypt = require('bcryptjs');
const { usersStore, transactionsStore } = require('../services/excel');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, requireRole('admin', 'librarian'), (req, res) => {
  try {
    const { q, role, page = 1, limit = 20 } = req.query;
    let users = usersStore.readAll().map(({ password, ...u }) => u);

    if (q) {
      const query = q.toLowerCase();
      users = users.filter(u =>
        (u.name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query)
      );
    }
    if (role) users = users.filter(u => u.role === role);

    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = users.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const start = (pageNum - 1) * limitNum;
    const paged = users.slice(start, start + limitNum);

    res.json({ users: paged, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// Quick list for dropdowns
router.get('/list', authenticateToken, requireRole('admin', 'librarian'), (_req, res) => {
  try {
    const users = usersStore.readAll().map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users list', details: err.message });
  }
});

router.get('/:id', authenticateToken, requireRole('admin', 'librarian'), (req, res) => {
  try {
    const user = usersStore.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password, ...safeUser } = user;
    const transactions = transactionsStore.find(t => t.userId === user.id);
    const activeCheckouts = transactions.filter(t => t.status === 'active').length;
    const totalBorrowed = transactions.length;

    res.json({ user: safeUser, stats: { activeCheckouts, totalBorrowed } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user', details: err.message });
  }
});

router.put('/:id/role', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'librarian', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const updated = await usersStore.update(req.params.id, { role });
    if (!updated) return res.status(404).json({ error: 'User not found' });

    const { password, ...safeUser } = updated;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role', details: err.message });
  }
});

router.put('/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const updated = await usersStore.update(req.params.id, { isActive: !!isActive });
    if (!updated) return res.status(404).json({ error: 'User not found' });

    const { password, ...safeUser } = updated;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status', details: err.message });
  }
});

router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = usersStore.findOne(u => u.email === email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await usersStore.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'member',
      provider: 'local',
      providerId: null,
      avatar: null,
      isActive: true,
      lastLogin: null,
    });

    const { password: _, ...safeUser } = user;
    res.status(201).json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

module.exports = router;
