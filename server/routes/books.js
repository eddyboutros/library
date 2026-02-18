const express = require('express');
const { booksStore, reviewsStore } = require('../services/excel');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, (req, res) => {
  try {
    const { q, genre, author, year, available, sort, page = 1, limit = 20 } = req.query;
    let books = booksStore.readAll();

    if (q) {
      const query = q.toLowerCase();
      books = books.filter(b =>
        (b.title || '').toLowerCase().includes(query) ||
        (b.author || '').toLowerCase().includes(query) ||
        (b.isbn || '').toLowerCase().includes(query) ||
        (b.genre || '').toLowerCase().includes(query) ||
        (b.description || '').toLowerCase().includes(query)
      );
    }

    if (genre) books = books.filter(b => (b.genre || '').toLowerCase() === genre.toLowerCase());
    if (author) books = books.filter(b => (b.author || '').toLowerCase().includes(author.toLowerCase()));
    if (year) books = books.filter(b => String(b.publishYear) === String(year));
    if (available === 'true') books = books.filter(b => b.availableCopies > 0);

    switch (sort) {
      case 'title': books.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'author': books.sort((a, b) => (a.author || '').localeCompare(b.author || '')); break;
      case 'year': books.sort((a, b) => (b.publishYear || 0) - (a.publishYear || 0)); break;
      case 'rating': books.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'newest': books.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      default: books.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const total = books.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const start = (pageNum - 1) * limitNum;
    const paged = books.slice(start, start + limitNum);

    const genres = [...new Set(booksStore.readAll().map(b => b.genre).filter(Boolean))].sort();

    res.json({
      books: paged,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      genres,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books', details: err.message });
  }
});

router.get('/stats', authenticateToken, (_req, res) => {
  try {
    const books = booksStore.readAll();
    const total = books.length;
    const available = books.filter(b => b.availableCopies > 0).length;
    const checkedOut = books.reduce((acc, b) => acc + (b.totalCopies - b.availableCopies), 0);
    const genres = {};
    books.forEach(b => {
      if (b.genre) genres[b.genre] = (genres[b.genre] || 0) + 1;
    });
    const topRated = [...books].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
    const recentlyAdded = [...books].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    res.json({ total, available, checkedOut, genres, topRated, recentlyAdded });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', details: err.message });
  }
});

router.get('/:id', optionalAuth, (req, res) => {
  try {
    const book = booksStore.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const reviews = reviewsStore.find(r => r.bookId === book.id);
    res.json({ book, reviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch book', details: err.message });
  }
});

router.post('/', authenticateToken, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const { title, author, isbn, genre, publishYear, publisher, description, coverUrl, totalCopies = 1 } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    const book = await booksStore.create({
      title,
      author,
      isbn: isbn || '',
      genre: genre || 'Uncategorized',
      publishYear: publishYear || null,
      publisher: publisher || '',
      description: description || '',
      coverUrl: coverUrl || '',
      totalCopies: parseInt(totalCopies),
      availableCopies: parseInt(totalCopies),
      rating: 0,
      ratingCount: 0,
      addedBy: req.user.id,
    });

    res.status(201).json({ book });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create book', details: err.message });
  }
});

router.put('/:id', authenticateToken, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const existing = booksStore.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Book not found' });

    const allowed = ['title', 'author', 'isbn', 'genre', 'publishYear', 'publisher', 'description', 'coverUrl', 'totalCopies'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.totalCopies !== undefined) {
      const diff = parseInt(updates.totalCopies) - existing.totalCopies;
      updates.availableCopies = Math.max(0, existing.availableCopies + diff);
    }

    const book = await booksStore.update(req.params.id, updates);
    res.json({ book });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update book', details: err.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const existing = booksStore.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Book not found' });

    await booksStore.delete(req.params.id);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book', details: err.message });
  }
});

// Reviews
router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const book = booksStore.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const existingReview = reviewsStore.findOne(r => r.bookId === req.params.id && r.userId === req.user.id);
    if (existingReview) {
      return res.status(409).json({ error: 'You have already reviewed this book' });
    }

    const review = await reviewsStore.create({
      bookId: req.params.id,
      userId: req.user.id,
      userName: req.user.name,
      rating: parseInt(rating),
      comment: comment || '',
    });

    const allReviews = reviewsStore.find(r => r.bookId === req.params.id);
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await booksStore.update(req.params.id, {
      rating: Math.round(avgRating * 10) / 10,
      ratingCount: allReviews.length,
    });

    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create review', details: err.message });
  }
});

module.exports = router;
