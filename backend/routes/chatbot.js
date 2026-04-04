const express = require('express');
const { body } = require('express-validator');
const axios = require('axios');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const Conversation = require('../models/Conversation');
const Settings = require('../models/Settings');

const router = express.Router();

const MAX_HISTORY = 20;

// Cache college website data for 1 hour
let collegeDataCache = { data: '', timestamp: 0 };
const COLLEGE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

const getSystemPrompt = () => {
  return `You are a college helpdesk assistant and academic tutor.

Response Length Rules:
1. Keep responses SHORT and concise (50-100 words) for simple questions
2. Only give DETAILED responses (150-250 words) when student explicitly asks for:
   - "explain in detail", "more information", "full explanation"
   - "describe", "elaborate", "expand"
   - "tell me everything about", "complete guide"
3. Use bullet points for quick answers

Formatting:
- Use **bold** for important terms
- Use bullet points (•) for lists
- Use numbered steps (1, 2, 3) for processes

Examples:
- Short: "To reset password, go to login page → click 'Forgot Password' → enter email → check inbox for link."
- Detailed (only when asked): "**Password Reset Process**\n1. Visit login page\n2. Click 'Forgot Password' link\n3. Enter your registered email address\n4. Check your email for reset link (check spam folder too)\n5. Click the link and create new password\n\nNote: Link expires in 24 hours."

General rules:
- Be friendly and helpful
- Keep answers under 100 words unless detailed explanation is requested
- Use simple language
- If unsure, suggest contacting support`;
};

const getCollegeData = async () => {
  const now = Date.now();
  if (collegeDataCache.data && (now - collegeDataCache.timestamp) < COLLEGE_CACHE_TTL) {
    return collegeDataCache.data;
  }
  
  try {
    // Get college URL from environment or use default
    const collegeUrl = process.env.COLLEGE_URL || 'https://kessc.edu.in';
    const urls = [collegeUrl, `www.${collegeUrl.replace(/^https?:\/\//, '')}`];
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

    // Get API key from database only
    let apiKey = '';
    let provider = 'groq';
    let model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
    
    // Check database for API key
    const dbSettings = await Settings.find({ key: { $in: ['AI_API_KEY', 'AI_MODEL'] } });
    dbSettings.forEach(s => {
      if (s.key === 'AI_API_KEY' && s.value) apiKey = s.value;
      if (s.key === 'AI_MODEL' && s.value) model = s.value;
    });

    // Auto-detect provider from key format
    if (apiKey) {
      if (apiKey.startsWith('sk-')) provider = 'openai';
      else if (apiKey.startsWith('sk-ant-')) provider = 'anthropic';
      else provider = 'groq';
    }

    if (!apiKey || !apiKey.trim()) {
      return res.status(503).json({ message: 'AI ChatBot is not available. Please contact admin.' });
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

    let reply;
    
    // Route to appropriate provider with error handling
    try {
      if (provider === 'openai') {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: model || 'gpt-4o-mini',
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
        reply = response.data.choices[0].message.content;
      } else if (provider === 'anthropic') {
        const anthropicMessages = conversation.messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));
        
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: model || 'claude-3-haiku-20240307',
            max_tokens: 500,
            system: getSystemPrompt(),
            messages: anthropicMessages
          },
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        reply = response.data.content[0].text;
      } else {
        // Default to Groq
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: model || 'llama-3.3-70b-versatile',
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
        reply = response.data.choices[0].message.content;
      }
    } catch (aiError) {
      console.error('AI API Error:', aiError.message);
      
      if (aiError.response) {
        const status = aiError.response.status;
        if (status === 401 || status === 403) {
          return res.status(503).json({ message: 'AI ChatBot is not available. Please contact admin.' });
        }
        if (status === 429) {
          return res.status(503).json({ message: 'AI ChatBot is busy. Please try again later.' });
        }
        if (status === 400) {
          return res.status(503).json({ message: 'AI ChatBot is not available. Please contact admin.' });
        }
      }
      
      if (aiError.code === 'ECONNABORTED') {
        return res.status(504).json({ message: 'AI ChatBot is not responding. Please try again.' });
      }
      
      return res.status(503).json({ message: 'AI ChatBot is not available. Please contact admin.' });
    }

    // Save assistant response
    conversation.messages.push({ role: 'assistant', content: reply });
    await conversation.save();

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
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
router.get('/status', auth, async (req, res) => {
  const dbSettings = await Settings.find({ key: 'AI_API_KEY' });
  const available = dbSettings.length > 0 && dbSettings[0].value && dbSettings[0].value.trim().length > 0;
  res.json({ available });
});

module.exports = router;