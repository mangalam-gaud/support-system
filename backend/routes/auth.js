const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
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

// Hidden seed — creates default admin if none exists (requires admin auth)
router.post('/_seed', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(409).json({ message: 'Admin already exists.', email: existingAdmin.email });
    }

    const admin = new User({
      name: 'Admin',
      email: 'admin@mangaud.com',
      password: 'admin@mangaud',
      role: 'admin'
    });
    await admin.save();

    res.status(201).json({ message: 'Admin created.', email: 'admin@mangaud.com', password: 'admin@mangaud' });
  } catch (err) {
    next(err);
  }
});

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

module.exports = router;
