const express = require('express');
const { booksStore, chaptersStore } = require('../services/excel');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSnippet(text, query, contextChars = 120) {
  if (!text) return '';
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, contextChars * 2) + (text.length > contextChars * 2 ? '...' : '');

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + query.length + contextChars);
  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += text.slice(start, end);
  if (end < text.length) snippet += '...';
  return snippet;
}

// Global content search across books, chapters, and chapter details
router.get('/', optionalAuth, (req, res) => {
  try {
    const { q, scope, page = 1, limit = 30 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const query = q.trim();
    const queryLower = query.toLowerCase();
    const searchScope = scope || 'all'; // 'all', 'books', 'chapters', 'content'
    const results = [];

    const books = booksStore.readAll();
    const chapters = chaptersStore.readAll();

    // Build a bookId -> book lookup
    const bookMap = {};
    books.forEach(b => { bookMap[b.id] = b; });

    // Search book-level fields
    if (searchScope === 'all' || searchScope === 'books') {
      books.forEach(book => {
        const fields = [book.title, book.author, book.isbn, book.genre, book.description, book.publisher];
        const matchField = fields.find(f => f && String(f).toLowerCase().includes(queryLower));

        if (matchField) {
          let matchIn = 'description';
          if ((book.title || '').toLowerCase().includes(queryLower)) matchIn = 'title';
          else if ((book.author || '').toLowerCase().includes(queryLower)) matchIn = 'author';
          else if ((book.isbn || '').toLowerCase().includes(queryLower)) matchIn = 'isbn';
          else if ((book.genre || '').toLowerCase().includes(queryLower)) matchIn = 'genre';

          results.push({
            type: 'book',
            bookId: book.id,
            bookTitle: book.title,
            bookAuthor: book.author,
            bookGenre: book.genre,
            matchIn,
            snippet: getSnippet(String(matchField), query),
            relevance: matchIn === 'title' ? 100 : matchIn === 'author' ? 90 : 50,
          });
        }
      });
    }

    // Search chapter titles and summaries
    if (searchScope === 'all' || searchScope === 'chapters') {
      chapters.forEach(ch => {
        const book = bookMap[ch.bookId];
        if (!book) return;

        const titleMatch = (ch.title || '').toLowerCase().includes(queryLower);
        const summaryMatch = (ch.summary || '').toLowerCase().includes(queryLower);

        if (titleMatch || summaryMatch) {
          results.push({
            type: 'chapter',
            bookId: ch.bookId,
            chapterId: ch.id,
            bookTitle: book.title,
            bookAuthor: book.author,
            bookGenre: book.genre,
            chapterNumber: ch.chapterNumber,
            chapterTitle: ch.title,
            matchIn: titleMatch ? 'chapter_title' : 'chapter_summary',
            snippet: getSnippet(titleMatch ? ch.title : ch.summary, query),
            relevance: titleMatch ? 80 : 60,
          });
        }
      });
    }

    // Search chapter content (full text)
    if (searchScope === 'all' || searchScope === 'content') {
      chapters.forEach(ch => {
        const book = bookMap[ch.bookId];
        if (!book) return;

        const contentStr = String(ch.content || '');
        if (!contentStr.toLowerCase().includes(queryLower)) return;

        // already matched via title/summary? skip to avoid duplication
        const alreadyMatched = results.some(
          r => r.type === 'chapter' && r.chapterId === ch.id
        );

        // Count occurrences in content for relevance
        const regex = new RegExp(escapeRegex(queryLower), 'gi');
        const occurrences = (contentStr.match(regex) || []).length;

        if (alreadyMatched) {
          const existing = results.find(r => r.chapterId === ch.id);
          if (existing) {
            existing.contentSnippet = getSnippet(contentStr, query);
            existing.occurrences = occurrences;
            existing.relevance += occurrences * 2;
          }
        } else {
          results.push({
            type: 'content',
            bookId: ch.bookId,
            chapterId: ch.id,
            bookTitle: book.title,
            bookAuthor: book.author,
            bookGenre: book.genre,
            chapterNumber: ch.chapterNumber,
            chapterTitle: ch.title,
            matchIn: 'chapter_content',
            snippet: getSnippet(contentStr, query),
            occurrences,
            relevance: 40 + occurrences * 2,
          });
        }
      });
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    const total = results.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const start = (pageNum - 1) * limitNum;
    const paged = results.slice(start, start + limitNum);

    // Aggregate stats
    const bookHits = results.filter(r => r.type === 'book').length;
    const chapterHits = results.filter(r => r.type === 'chapter').length;
    const contentHits = results.filter(r => r.type === 'content').length;
    const uniqueBooks = new Set(results.map(r => r.bookId)).size;

    res.json({
      results: paged,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      stats: { bookHits, chapterHits, contentHits, uniqueBooks },
      query,
    });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

module.exports = router;
