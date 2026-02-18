const express = require('express');
const { transactionsStore, booksStore, usersStore } = require('../services/excel');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, userId, bookId, type, page = 1, limit = 20 } = req.query;
    let transactions = transactionsStore.readAll();

    if (req.user.role === 'member') {
      transactions = transactions.filter(t => t.userId === req.user.id);
    }

    if (status) transactions = transactions.filter(t => t.status === status);
    if (userId) transactions = transactions.filter(t => t.userId === userId);
    if (bookId) transactions = transactions.filter(t => t.bookId === bookId);
    if (type) transactions = transactions.filter(t => t.type === type);

    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    transactions = transactions.map(t => {
      const book = booksStore.findById(t.bookId);
      const user = usersStore.findById(t.userId);
      return {
        ...t,
        bookTitle: book?.title || 'Unknown',
        bookAuthor: book?.author || 'Unknown',
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown',
      };
    });

    const total = transactions.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const start = (pageNum - 1) * limitNum;
    const paged = transactions.slice(start, start + limitNum);

    res.json({ transactions: paged, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions', details: err.message });
  }
});

router.get('/stats', authenticateToken, (_req, res) => {
  try {
    const transactions = transactionsStore.readAll();
    const active = transactions.filter(t => t.status === 'active').length;
    const overdue = transactions.filter(t => t.status === 'active' && new Date(t.dueDate) < new Date()).length;
    const returned = transactions.filter(t => t.status === 'returned').length;
    const total = transactions.length;

    const recent = [...transactions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(t => {
        const book = booksStore.findById(t.bookId);
        const user = usersStore.findById(t.userId);
        return { ...t, bookTitle: book?.title, userName: user?.name };
      });

    res.json({ active, overdue, returned, total, recent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// Check out a book (borrow)
router.post('/checkout', authenticateToken, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const { bookId, userId, dueDate, notes } = req.body;

    if (!bookId || !userId) {
      return res.status(400).json({ error: 'Book ID and User ID are required' });
    }

    const book = booksStore.findById(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.availableCopies <= 0) return res.status(400).json({ error: 'No copies available for checkout' });

    const user = usersStore.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const activeCheckouts = transactionsStore.find(t => t.userId === userId && t.status === 'active');
    if (activeCheckouts.length >= 5) {
      return res.status(400).json({ error: 'User has reached maximum checkout limit (5 books)' });
    }

    const alreadyBorrowed = transactionsStore.findOne(t => t.bookId === bookId && t.userId === userId && t.status === 'active');
    if (alreadyBorrowed) {
      return res.status(400).json({ error: 'User already has this book checked out' });
    }

    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14);

    const transaction = await transactionsStore.create({
      bookId,
      userId,
      type: 'checkout',
      checkoutDate: new Date().toISOString(),
      dueDate: dueDate || defaultDue.toISOString(),
      returnDate: null,
      status: 'active',
      notes: notes || '',
      processedBy: req.user.id,
    });

    await booksStore.update(bookId, { availableCopies: book.availableCopies - 1 });

    res.status(201).json({ transaction });
  } catch (err) {
    res.status(500).json({ error: 'Checkout failed', details: err.message });
  }
});

// Check in a book (return)
router.post('/checkin', authenticateToken, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const { transactionId, notes } = req.body;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const transaction = transactionsStore.findById(transactionId);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.status === 'returned') return res.status(400).json({ error: 'Book already returned' });

    const book = booksStore.findById(transaction.bookId);

    await transactionsStore.update(transactionId, {
      status: 'returned',
      returnDate: new Date().toISOString(),
      notes: notes ? `${transaction.notes || ''} | Return note: ${notes}` : transaction.notes,
    });

    if (book) {
      await booksStore.update(book.id, { availableCopies: Math.min(book.totalCopies, book.availableCopies + 1) });
    }

    res.json({ message: 'Book checked in successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Check-in failed', details: err.message });
  }
});

// Self-checkout for members
router.post('/self-checkout', authenticateToken, async (req, res) => {
  try {
    const { bookId } = req.body;
    if (!bookId) return res.status(400).json({ error: 'Book ID is required' });

    const book = booksStore.findById(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.availableCopies <= 0) return res.status(400).json({ error: 'No copies available' });

    const activeCheckouts = transactionsStore.find(t => t.userId === req.user.id && t.status === 'active');
    if (activeCheckouts.length >= 5) {
      return res.status(400).json({ error: 'Maximum checkout limit reached (5 books)' });
    }

    const alreadyBorrowed = transactionsStore.findOne(t => t.bookId === bookId && t.userId === req.user.id && t.status === 'active');
    if (alreadyBorrowed) {
      return res.status(400).json({ error: 'You already have this book checked out' });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const transaction = await transactionsStore.create({
      bookId,
      userId: req.user.id,
      type: 'checkout',
      checkoutDate: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      returnDate: null,
      status: 'active',
      notes: 'Self-checkout',
      processedBy: req.user.id,
    });

    await booksStore.update(bookId, { availableCopies: book.availableCopies - 1 });

    res.status(201).json({ transaction });
  } catch (err) {
    res.status(500).json({ error: 'Self-checkout failed', details: err.message });
  }
});

module.exports = router;
