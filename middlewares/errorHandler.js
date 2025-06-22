const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer specific errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        details: 'Maximum file size is 10MB'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'Unexpected file field',
        details: 'Only profile picture upload is allowed'
      });
    }
  }

  // File type errors from custom filter
  if (err.message.includes('Only image files are allowed')) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      details: 'Only image files (JPEG, PNG, GIF, WebP) are allowed'
    });
  }

  // Default error
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

export default errorHandler;