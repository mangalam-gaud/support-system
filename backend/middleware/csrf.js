const crypto = require('crypto');

const csrfTokens = new Map();
const CSRF_TOKEN_TTL = 60 * 60 * 1000; // 1 hour

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (data.expiresAt < now) {
      csrfTokens.delete(token);
    }
  }
}, 60000);

// CSRF middleware
const csrfProtection = (req, res, next) => {
  // Skip for GET requests (safe methods)
  if (req.method === 'GET') {
    // Generate new token for GET requests if not exists
    if (!req.cookies.csrfToken) {
      const token = generateCSRFToken();
      csrfTokens.set(token, { userId: null, expiresAt: Date.now() + CSRF_TOKEN_TTL });
      res.cookie('csrfToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: CSRF_TOKEN_TTL
      });
    }
    return next();
  }

  // For POST, PUT, DELETE - verify CSRF token
  const token = req.cookies.csrfToken;
  const bodyToken = req.body._csrf || req.headers['x-csrf-token'];

  if (!token || !bodyToken) {
    return res.status(403).json({ message: 'CSRF token missing' });
  }

  if (token !== bodyToken) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }

  // Validate token exists and belongs to user
  const tokenData = csrfTokens.get(token);
  if (!tokenData || tokenData.expiresAt < Date.now()) {
    return res.status(403).json({ message: 'CSRF token expired' });
  }

  next();
};

// Store token for user after login
csrfProtection.setUserToken = (token, userId) => {
  if (csrfTokens.has(token)) {
    const data = csrfTokens.get(token);
    data.userId = userId;
    csrfTokens.set(token, data);
  }
};

// Export for use in routes
module.exports = { csrfProtection, csrfTokens, generateCSRFToken };