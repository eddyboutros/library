const express = require('express');
const { chaptersStore, booksStore } = require('../services/excel');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all chapters for a book
router.get('/book/:bookId', optionalAuth, (req, res) => {
  try {
    const book = booksStore.findById(req.params.bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const chapters = chaptersStore
      .find(c => c.bookId === req.params.bookId)
      .sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));

    res.json({ chapters, bookTitle: book.title });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chapters', details: err.message });
  }
});

// Get a single chapter with full content
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const chapter = chaptersStore.findById(req.params.id);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const book = booksStore.findById(chapter.bookId);
    res.json({ chapter, bookTitle: book?.title, bookAuthor: book?.author });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chapter', details: err.message });
  }
});

// Add a chapter to a book
router.post('/', authenticateToken, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const { bookId, chapterNumber, title, summary, content } = req.body;

    if (!bookId || !title) {
      return res.status(400).json({ error: 'Book ID and chapter title are required' });
    }

    const book = booksStore.findById(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const existingChapters = chaptersStore.find(c => c.bookId === bookId);
    const autoNumber = chapterNumber || (existingChapters.length + 1);

    const chapter = await chaptersStore.create({
      bookId,
      chapterNumber: parseInt(autoNumber),
      title,
      summary: summary || '',
      content: content || '',
      addedBy: req.user.id,
    });

    res.status(201).json({ chapter });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create chapter', details: err.message });
  }
});

// Bulk add chapters
router.post('/bulk', authenticateToken, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const { bookId, chapters } = req.body;

    if (!bookId || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ error: 'Book ID and chapters array are required' });
    }

    const book = booksStore.findById(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const existingChapters = chaptersStore.find(c => c.bookId === bookId);
    const startNumber = existingChapters.length + 1;

    const items = chapters.map((ch, i) => ({
      bookId,
      chapterNumber: ch.chapterNumber || (startNumber + i),
      title: ch.title || `Chapter ${startNumber + i}`,
      summary: ch.summary || '',
      content: ch.content || '',
      addedBy: req.user.id,
    }));

    const created = await chaptersStore.createMany(items);
    res.status(201).json({ chapters: created, count: created.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create chapters', details: err.message });
  }
});

// Update a chapter
router.put('/:id', authenticateToken, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const existing = chaptersStore.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Chapter not found' });

    const allowed = ['chapterNumber', 'title', 'summary', 'content'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (updates.chapterNumber) updates.chapterNumber = parseInt(updates.chapterNumber);

    const chapter = await chaptersStore.update(req.params.id, updates);
    res.json({ chapter });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update chapter', details: err.message });
  }
});

// Delete a chapter
router.delete('/:id', authenticateToken, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const existing = chaptersStore.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Chapter not found' });

    await chaptersStore.delete(req.params.id);
    res.json({ message: 'Chapter deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete chapter', details: err.message });
  }
});

// Reorder chapters for a book
router.put('/reorder/:bookId', authenticateToken, requireRole('admin', 'librarian'), async (req, res) => {
  try {
    const { order } = req.body; // array of { id, chapterNumber }
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Order array required' });

    for (const item of order) {
      await chaptersStore.update(item.id, { chapterNumber: item.chapterNumber });
    }

    const chapters = chaptersStore
      .find(c => c.bookId === req.params.bookId)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    res.json({ chapters });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder chapters', details: err.message });
  }
});

module.exports = router;
