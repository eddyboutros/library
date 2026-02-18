const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { aiSmartSearch, aiRecommendations, aiChat, aiCategorize, isAIAvailable } = require('../services/ai');

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json({ available: isAIAvailable(), engine: isAIAvailable() ? 'openai' : 'local' });
});

router.post('/search', optionalAuth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Search query is required' });

    const results = await aiSmartSearch(query);
    res.json({ results, engine: isAIAvailable() ? 'ai' : 'local' });
  } catch (err) {
    res.status(500).json({ error: 'AI search failed', details: err.message });
  }
});

router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const recommendations = await aiRecommendations(req.user.id);
    res.json({ recommendations, engine: isAIAvailable() ? 'ai' : 'local' });
  } catch (err) {
    res.status(500).json({ error: 'Recommendations failed', details: err.message });
  }
});

router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const response = await aiChat(message, history || []);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
});

router.post('/categorize', authenticateToken, async (req, res) => {
  try {
    const { title, author, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const genre = await aiCategorize(title, author || '', description || '');
    res.json({ genre });
  } catch (err) {
    res.status(500).json({ error: 'Categorization failed', details: err.message });
  }
});

module.exports = router;
