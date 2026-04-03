const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple in-memory cache for authenticated users (5 minute TTL)
const userCache = new Map();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedUser = async (userId) => {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }
  return null;
};

const setCachedUser = (userId, user) => {
  userCache.set(userId, { user, expiresAt: Date.now() + CACHE_TTL });
};

// Cleanup expired cache entries periodically
let cleanupInterval = null;

const startCacheCleanup = () => {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of userCache.entries()) {
      if (value.expiresAt <= now) {
        userCache.delete(key);
      }
    }
  }, 60000);
};

// Start cleanup when module loads
startCacheCleanup();

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try cache first
    let user = await getCachedUser(decoded.userId);
    
    if (!user) {
      user = await User.findById(decoded.userId);
      if (user) {
        setCachedUser(decoded.userId, user);
      }
    }
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or deactivated.' });
    }

    req.userId = decoded.userId;
    req.role = decoded.role;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    return res.status(500).json({ message: 'Authentication error.' });
  }
};

// Clear user from cache (call on logout)
auth.clearCache = (userId) => userCache.delete(userId);

// Export cleanup for testing
auth.stopCacheCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

module.exports = auth;
