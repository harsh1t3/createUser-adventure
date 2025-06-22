const fs = require('fs').promises;
const path = require('path');

const cleanupUploadedFile = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  const cleanup = async () => {
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
        console.log(`Cleaned up temporary file: ${req.file.path}`);
      } catch (err) {
        console.warn(`Failed to cleanup file ${req.file.path}:`, err.message);
      }
    }
  };

  res.send = function(...args) {
    cleanup();
    return originalSend.apply(this, args);
  };

  res.json = function(...args) {
    cleanup();
    return originalJson.apply(this, args);
  };

  next();
};

module.exports = cleanupUploadedFile;