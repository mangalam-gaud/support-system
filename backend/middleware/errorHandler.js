const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format.' });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ message: `Duplicate value for field: ${field}` });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 3 MB.' });
    }
    return res.status(400).json({ message: 'File upload error.' });
  }

  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ message: err.message });
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({ message });
};

module.exports = errorHandler;
