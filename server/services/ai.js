const { booksStore, transactionsStore, reviewsStore } = require('./excel');

let openai = null;

function initOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey !== 'your-openai-api-key') {
    try {
      const OpenAI = require('openai');
      openai = new OpenAI({ apiKey });
      console.log('  OpenAI API initialized');
    } catch {
      console.log('  OpenAI not available, using local AI fallbacks');
    }
  } else {
    console.log('  No OpenAI API key, using local AI fallbacks');
  }
}

function isAIAvailable() {
  return openai !== null;
}

// ─── Local Fallback: Fuzzy Search ───
function localSmartSearch(query, books) {
  const q = query.toLowerCase();
  const keywords = q.split(/\s+/).filter(w => w.length > 2);

  const genreKeywords = {
    fiction: ['fiction', 'novel', 'story', 'stories', 'narrative'],
    'science fiction': ['sci-fi', 'science fiction', 'space', 'future', 'dystopia', 'dystopian'],
    fantasy: ['fantasy', 'magic', 'wizard', 'dragon', 'mythical', 'quest'],
    romance: ['romance', 'love', 'relationship', 'heart'],
    mystery: ['mystery', 'detective', 'crime', 'thriller', 'suspense', 'murder'],
    classic: ['classic', 'literature', 'literary', 'timeless'],
    philosophy: ['philosophy', 'philosophical', 'meaning', 'existence', 'think'],
    adventure: ['adventure', 'journey', 'explore', 'quest', 'travel'],
    horror: ['horror', 'scary', 'fear', 'dark', 'ghost'],
  };

  return books
    .map(book => {
      let score = 0;
      const title = (book.title || '').toLowerCase();
      const author = (book.author || '').toLowerCase();
      const genre = (book.genre || '').toLowerCase();
      const desc = (book.description || '').toLowerCase();

      keywords.forEach(kw => {
        if (title.includes(kw)) score += 10;
        if (author.includes(kw)) score += 8;
        if (genre.includes(kw)) score += 5;
        if (desc.includes(kw)) score += 3;
      });

      for (const [g, syns] of Object.entries(genreKeywords)) {
        if (syns.some(s => q.includes(s))) {
          if (genre.includes(g)) score += 7;
        }
      }

      if (q.includes('available') && book.availableCopies > 0) score += 3;
      if (q.includes('popular') && book.rating >= 4) score += 5;
      if (q.includes('new') || q.includes('recent')) {
        if (book.publishYear >= 2020) score += 4;
      }
      if (q.includes('old') || q.includes('classic')) {
        if (book.publishYear < 1970) score += 4;
      }

      return { ...book, _score: score };
    })
    .filter(b => b._score > 0)
    .sort((a, b) => b._score - a._score);
}

// ─── Local Fallback: Recommendations ───
function localRecommendations(userId) {
  const transactions = transactionsStore.readAll();
  const books = booksStore.readAll();
  const reviews = reviewsStore.readAll();

  const userTransactions = transactions.filter(t => t.userId === userId);
  const borrowedBookIds = new Set(userTransactions.map(t => t.bookId));
  const borrowedBooks = books.filter(b => borrowedBookIds.has(b.id));

  const genreCounts = {};
  const authorCounts = {};
  borrowedBooks.forEach(b => {
    if (b.genre) genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
    if (b.author) authorCounts[b.author] = (authorCounts[b.author] || 0) + 1;
  });

  const userReviews = reviews.filter(r => r.userId === userId);
  const highRatedIds = new Set(userReviews.filter(r => r.rating >= 4).map(r => r.bookId));

  return books
    .filter(b => !borrowedBookIds.has(b.id))
    .map(b => {
      let score = 0;
      if (b.genre && genreCounts[b.genre]) score += genreCounts[b.genre] * 3;
      if (b.author && authorCounts[b.author]) score += authorCounts[b.author] * 5;
      if (b.rating) score += b.rating;
      if (b.availableCopies > 0) score += 2;
      return { ...b, _score: score, reason: buildReason(b, genreCounts, authorCounts) };
    })
    .filter(b => b._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 8);
}

function buildReason(book, genreCounts, authorCounts) {
  const reasons = [];
  if (book.author && authorCounts[book.author]) reasons.push(`You've enjoyed books by ${book.author}`);
  if (book.genre && genreCounts[book.genre]) reasons.push(`Based on your interest in ${book.genre}`);
  if (book.rating >= 4.5) reasons.push('Highly rated');
  return reasons.join('. ') || 'You might enjoy this book';
}

// ─── AI-Powered Features ───
async function aiSmartSearch(query) {
  const books = booksStore.readAll();
  if (!openai) return localSmartSearch(query, books);

  try {
    const bookList = books.map(b =>
      `[${b.id}] "${b.title}" by ${b.author} | Genre: ${b.genre} | Year: ${b.publishYear} | Available: ${b.availableCopies}/${b.totalCopies} | Rating: ${b.rating}/5`
    ).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a library search assistant. Given a user query and a book catalog, return the IDs of the most relevant books as a JSON array. Consider semantic meaning, genre preferences, and reading intent. Return ONLY a JSON array of IDs, nothing else.`,
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\nCatalog:\n${bookList}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content.trim();
    const ids = JSON.parse(content.replace(/```json?\n?/g, '').replace(/```/g, ''));
    return books.filter(b => ids.includes(b.id));
  } catch (err) {
    console.error('AI search error, falling back to local:', err.message);
    return localSmartSearch(query, books);
  }
}

async function aiRecommendations(userId) {
  const books = booksStore.readAll();
  const transactions = transactionsStore.readAll();
  if (!openai) return localRecommendations(userId);

  try {
    const userTx = transactions.filter(t => t.userId === userId);
    const borrowedIds = new Set(userTx.map(t => t.bookId));
    const borrowedBooks = books.filter(b => borrowedIds.has(b.id));

    const historyStr = borrowedBooks.map(b => `"${b.title}" by ${b.author} (${b.genre})`).join(', ');
    const catalogStr = books
      .filter(b => !borrowedIds.has(b.id))
      .map(b => `[${b.id}] "${b.title}" by ${b.author} | ${b.genre} | Rating: ${b.rating}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a book recommendation engine. Given a user's reading history and available catalog, recommend books. Return a JSON array of objects: [{ "id": "...", "reason": "..." }]. Max 6 recommendations.`,
        },
        {
          role: 'user',
          content: `Reading history: ${historyStr || 'No books borrowed yet'}\n\nAvailable catalog:\n${catalogStr}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0].message.content.trim();
    const recs = JSON.parse(content.replace(/```json?\n?/g, '').replace(/```/g, ''));
    return recs.map(r => {
      const book = books.find(b => b.id === r.id);
      return book ? { ...book, reason: r.reason } : null;
    }).filter(Boolean);
  } catch (err) {
    console.error('AI recommendation error, falling back to local:', err.message);
    return localRecommendations(userId);
  }
}

async function aiChat(message, conversationHistory = []) {
  const books = booksStore.readAll();
  const stats = {
    totalBooks: books.length,
    availableBooks: books.filter(b => b.availableCopies > 0).length,
    genres: [...new Set(books.map(b => b.genre).filter(Boolean))],
    topRated: books.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5),
  };

  if (!openai) {
    return generateLocalChatResponse(message, books, stats);
  }

  try {
    const systemPrompt = `You are a friendly and knowledgeable library assistant named "Athena". You help users find books, answer questions about the library catalog, and provide reading suggestions.

Current library stats:
- Total books: ${stats.totalBooks}
- Available books: ${stats.availableBooks}
- Genres available: ${stats.genres.join(', ')}
- Top rated books: ${stats.topRated.map(b => `"${b.title}" by ${b.author} (${b.rating}/5)`).join(', ')}

Book catalog summary:
${books.slice(0, 30).map(b => `"${b.title}" by ${b.author} | ${b.genre} | ${b.publishYear} | Available: ${b.availableCopies}/${b.totalCopies}`).join('\n')}

Be concise, helpful, and enthusiastic about reading. If asked about a book not in the catalog, say so and suggest similar ones that are available.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: message },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 600,
    });

    return {
      message: response.choices[0].message.content,
      source: 'ai',
    };
  } catch (err) {
    console.error('AI chat error, falling back to local:', err.message);
    return generateLocalChatResponse(message, books, stats);
  }
}

function generateLocalChatResponse(message, books, stats) {
  const q = message.toLowerCase();

  if (q.includes('how many') && q.includes('book')) {
    return { message: `We currently have ${stats.totalBooks} books in our catalog, with ${stats.availableBooks} available for borrowing.`, source: 'local' };
  }
  if (q.includes('genre') || q.includes('categories')) {
    return { message: `Our library covers these genres: ${stats.genres.join(', ')}. What genre interests you?`, source: 'local' };
  }
  if (q.includes('recommend') || q.includes('suggest') || q.includes('what should')) {
    const top = stats.topRated.slice(0, 3);
    const recs = top.map(b => `"${b.title}" by ${b.author} (${b.rating}/5)`).join(', ');
    return { message: `Here are our top-rated books: ${recs}. Would you like suggestions in a specific genre?`, source: 'local' };
  }
  if (q.includes('popular') || q.includes('best') || q.includes('top')) {
    const top = stats.topRated.slice(0, 5);
    const list = top.map(b => `• "${b.title}" by ${b.author} — ${b.rating}/5`).join('\n');
    return { message: `Our most popular books:\n${list}`, source: 'local' };
  }
  if (q.includes('available')) {
    return { message: `We have ${stats.availableBooks} out of ${stats.totalBooks} books currently available for borrowing.`, source: 'local' };
  }

  const matchedBooks = localSmartSearch(message, books).slice(0, 3);
  if (matchedBooks.length > 0) {
    const list = matchedBooks.map(b => `• "${b.title}" by ${b.author} (${b.genre})`).join('\n');
    return { message: `I found these books that might match your query:\n${list}\n\nWould you like more details about any of them?`, source: 'local' };
  }

  return {
    message: `I'm Athena, your library assistant! I can help you with:\n• Finding books by title, author, or genre\n• Getting reading recommendations\n• Checking library statistics\n• Answering questions about our catalog\n\nWhat would you like to know?`,
    source: 'local',
  };
}

async function aiCategorize(title, author, description) {
  const genres = ['Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Romance',
    'Thriller', 'Horror', 'Biography', 'History', 'Science', 'Philosophy',
    'Self-Help', 'Poetry', 'Drama', 'Adventure', 'Children', 'Young Adult'];

  if (!openai) {
    const text = `${title} ${author} ${description}`.toLowerCase();
    const genreScores = genres.map(g => ({
      genre: g,
      score: text.includes(g.toLowerCase()) ? 1 : 0,
    }));
    const best = genreScores.sort((a, b) => b.score - a.score)[0];
    return best.score > 0 ? best.genre : 'Fiction';
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a book categorization assistant. Given a book's title, author, and description, suggest the best genre. Return ONLY the genre name. Choose from: ${genres.join(', ')}.`,
        },
        {
          role: 'user',
          content: `Title: ${title}\nAuthor: ${author}\nDescription: ${description || 'N/A'}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    return response.choices[0].message.content.trim();
  } catch {
    return 'Fiction';
  }
}

module.exports = { initOpenAI, isAIAvailable, aiSmartSearch, aiRecommendations, aiChat, aiCategorize, localSmartSearch };
