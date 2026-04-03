const express = require('express');
const { body } = require('express-validator');
const axios = require('axios');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const Conversation = require('../models/Conversation');

const router = express.Router();

const MAX_HISTORY = 20;

// Cache college website data for 1 hour
let collegeDataCache = { data: '', timestamp: 0 };
const COLLEGE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const getSystemPrompt = () => {
  return `You are a college helpdesk assistant and academic tutor.

Your role:
- Help students with system-related issues (login, platform usage, support tickets)
- Answer academic questions (subjects, concepts, theory)

Instructions:

1. If the question is academic:
- Answer in structured format:
  Definition
  Explanation
  Example (if applicable)

2. If the question is helpdesk/system-related:
- Provide step-by-step guidance

3. If both:
- Answer helpdesk part first, then academic

4. If relevant information is found in the college website data, use it.
Otherwise, answer normally.

General rules:
- Be friendly, professional, and helpful
- Keep answers under 300 words
- Use simple language
- If unsure, suggest contacting support`;
};

const getCollegeData = async () => {
  const now = Date.now();
  if (collegeDataCache.data && (now - collegeDataCache.timestamp) < COLLEGE_CACHE_TTL) {
    return collegeDataCache.data;
  }
  
  try {
    // Try multiple potential college URLs
    const urls = ['https://kessc.edu.in', 'https://www.kessc.edu.in'];
    let text = '';
    
    for (const url of urls) {
      try {
        const res = await axios.get(url, { timeout: 5000 });
        const html = res.data;
        // Simple text extraction
        text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000);
        if (text.length > 100) break;
      } catch (e) {
        continue;
      }
    }
    
    if (text) {
      collegeDataCache = { data: text, timestamp: now };
    }
    return text || '';
  } catch (err) {
    return '';
  }
};

// Chat endpoint
router.post('/chat', auth, [
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters')
], validate, async (req, res, next) => {
  try {
    const { message } = req.body;
    const userId = req.userId;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'AI service not configured. Contact admin to set GROQ_API_KEY.' });
    }

    // Get or create conversation
    let conversation = await Conversation.findOne({ userId });
    if (!conversation) {
      conversation = new Conversation({ userId, messages: [] });
    }

    // Add user message
    conversation.messages.push({ role: 'user', content: message });
    
    // Trim to max history
    if (conversation.messages.length > MAX_HISTORY) {
      conversation.messages = conversation.messages.slice(-MAX_HISTORY);
    }
    await conversation.save();

    const websiteData = await getCollegeData();

    // Build messages for API
    const apiMessages = [
      { role: 'system', content: getSystemPrompt() },
      ...(websiteData ? [{ role: 'system', content: `College Website Data:\n${websiteData}` }] : []),
      ...conversation.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        messages: apiMessages,
        max_tokens: 500,
        temperature: 0.5
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const reply = response.data.choices[0].message.content;

    // Save assistant response
    conversation.messages.push({ role: 'assistant', content: reply });
    await conversation.save();

    res.json({ reply, usage: response.data.usage });
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      if (status === 429) {
        return res.status(429).json({ message: 'AI service rate limited. Try again later.' });
      }
      if (status === 401) {
        return res.status(503).json({ message: 'AI service not configured properly.' });
      }
      return res.status(502).json({ message: 'AI service error. Try again later.' });
    }
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ message: 'AI service timed out. Try again.' });
    }
    next(err);
  }
});

// Clear history
router.delete('/history', auth, async (req, res, next) => {
  try {
    await Conversation.findOneAndDelete({ userId: req.userId });
    res.json({ message: 'Conversation history cleared.' });
  } catch (err) {
    next(err);
  }
});

// Status check
router.get('/status', auth, (req, res) => {
  const available = !!process.env.GROQ_API_KEY;
  res.json({ available });
});

module.exports = router;