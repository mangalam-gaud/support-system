const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.role) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}.`
      });
    }
    next();
  };
};

module.exports = requireRole;
