const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = express.Router();

// Helper to escape regex special characters (prevents ReDoS)
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['student', 'worker']).withMessage('Role must be student or worker')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];

// Hidden seed — removes hardcoded credentials, use admin panel for user management
// router.post('/_seed', ...) - REMOVED for security

// Register — public, cannot self-register as admin
router.post('/register', registerValidation, validate, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const assignedRole = role || 'student';

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const user = new User({ name, email, password, role: assignedRole });
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', loginValidation, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id, user.role);

    // Generate and set CSRF token
    const csrfToken = require('../middleware/csrf').generateCSRFToken();
    res.cookie('csrfToken', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get current user profile
router.get('/me', auth, async (req, res, next) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// Update own profile
router.put('/me', auth, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail()
], validate, async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.userId } });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use.' });
      }
      updates.email = email;
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      }
    });
  } catch (err) {
    next(err);
  }
});

// Upload profile image
router.put('/me/profile-image', auth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file.' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed.' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { profileImage: `/uploads/${req.file.filename}` },
      { new: true }
    );

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      }
    });
  } catch (err) {
    next(err);
  }
});

// Change password
router.put('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], validate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    // Clear user cache on password change
    const auth = require('../middleware/auth');
    auth.clearCache(req.userId);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
});

// Logout endpoint - clears user cache
router.post('/logout', auth, async (req, res, next) => {
  try {
    const auth = require('../middleware/auth');
    auth.clearCache(req.userId);
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// Get all workers — admin only, sorted by rating (highest first)
router.get('/workers', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const workers = await User.find({ role: 'worker', isActive: true })
      .select('name email rating totalRatings createdAt')
      .sort({ rating: -1, totalRatings: -1 });
    res.json({ workers });
  } catch (err) {
    next(err);
  }
});

// Admin: get all users with pagination
router.get('/users', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const role = req.query.role;
    const search = req.query.search;

    const filter = {};
    if (role && ['student', 'admin', 'worker'].includes(role)) {
      filter.role = role;
    }
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-password -__v').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Admin: create user with any role
router.post('/users', auth, requireRole('admin'), [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['student', 'admin', 'worker'])
], validate, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const user = new User({ name, email, password, role });
    await user.save();

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    next(err);
  }
});

// Admin: deactivate/reactivate user
router.put('/users/:id/status', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean.' });
    }

    if (req.params.id === req.userId.toString()) {
      return res.status(400).json({ message: 'Cannot deactivate your own account.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Clear user cache when status changes
    const auth = require('../middleware/auth');
    auth.clearCache(req.params.id);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    next(err);
  }
});

// Admin: reset user password
router.put('/users/:id/password', auth, requireRole('admin'), [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], validate, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;

    if (userId === req.userId.toString()) {
      return res.status(400).json({ message: 'Cannot reset your own password this way. Use change-password instead.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save();

    // Clear user cache
    const auth = require('../middleware/auth');
    auth.clearCache(userId);

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
});

// Admin: update user details
router.put('/users/:id', auth, requireRole('admin'), [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail()
], validate, async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check for duplicate email
    if (email && email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use.' });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    next(err);
  }
});

// Admin: Update system settings (like API keys)
router.put('/settings', auth, requireRole('admin'), [
  body('key').notEmpty().withMessage('Setting key is required'),
], validate, async (req, res, next) => {
  try {
    const { key, value } = req.body;
    
    // Validate API key value if it's an API key
    if (key.includes('API_KEY') && value && value.length > 500) {
      return res.status(400).json({ message: 'API key too long (max 500 characters)' });
    }
    
    let setting = await Settings.findOne({ key });
    if (setting) {
      setting.value = value || '';
      await setting.save();
    } else {
      setting = new Settings({ key, value: value || '' });
      await setting.save();
    }

    if (value) {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }

    res.json({ message: `${key} updated successfully` });
  } catch (err) {
    next(err);
  }
});

// Get all system settings (admin only)
router.get('/settings', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const settings = await Settings.find();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json({ settings: settingsObj });
  } catch (err) {
    next(err);
  }
});

// Verify API key (admin only)
router.post('/verify-api-key', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ valid: false, message: 'API key is required' });
    }

    const axios = require('axios');
    const key = apiKey.trim();
    
    // Try to determine provider and verify
    let provider = 'groq';
    
    if (key.startsWith('sk-') && !key.startsWith('sk-ant-')) {
      provider = 'openai';
    } else if (key.startsWith('sk-ant-')) {
      provider = 'anthropic';
    } else if (key.startsWith('AIza')) {
      provider = 'google';
    }

    let success = false;
    let errorMsg = 'Unknown error';

    if (provider === 'openai') {
      try {
        await axios.get(
          'https://api.openai.com/v1/models',
          { headers: { 'Authorization': `Bearer ${key}` }, timeout: 10000 }
        );
        success = true;
      } catch (err) {
        errorMsg = 'Invalid API key';
      }
    } else if (provider === 'anthropic') {
      try {
        await axios.post(
          'https://api.anthropic.com/v1/messages',
          { model: 'claude-3-haiku-20240307', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] },
          { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, timeout: 10000 }
        );
        success = true;
      } catch (err) {
        errorMsg = 'Invalid API key';
      }
    } else if (provider === 'google') {
      try {
        await axios.get(
          `https://generativelanguage.googleapis.com/v1/models?key=${key}`,
          { timeout: 10000 }
        );
        success = true;
      } catch (err) {
        errorMsg = 'Invalid API key';
      }
    } else {
      // Default: Groq - try a simple chat completion
      try {
        await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 5 },
          { headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 10000 }
        );
        success = true;
      } catch (err) {
        errorMsg = 'Invalid API key';
      }
    }

    if (success) {
      res.json({ valid: true, provider, message: 'API key is valid' });
    } else {
      res.json({ valid: false, provider, message: errorMsg });
    }
  } catch (err) {
    console.error('Verify API key error:', err.message);
    res.status(500).json({ valid: false, message: 'Failed to verify API key' });
  }
});

// Delete system settings (admin only)
router.delete('/settings/:key', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { key } = req.params;
    
    const allowedKeys = ['AI_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AI_MODEL', 'AI_PROVIDER'];
    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ message: 'Invalid setting key' });
    }

    await Settings.deleteOne({ key });
    delete process.env[key];

    res.json({ message: `${key} deleted successfully` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
