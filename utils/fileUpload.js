const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Save file to uploads directory
 * @param {Object} file - The file object from request
 * @param {String} oldFilePath - Path to old file (for updates)
 * @returns {String} - Path to saved file
 */
exports.saveFile = (file, oldFilePath = null) => {
  return new Promise((resolve, reject) => {
    try {
      // If updating and old file exists, delete it
      if (oldFilePath) {
        const fullOldPath = path.join(__dirname, '../public', oldFilePath);
        if (fs.existsSync(fullOldPath)) {
          fs.unlinkSync(fullOldPath);
        }
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueId = crypto.randomBytes(8).toString('hex');
      const fileName = `${Date.now()}-${uniqueId}${fileExtension}`;
      
      // Create write stream
      const filePath = path.join(uploadDir, fileName);
      const writeStream = fs.createWriteStream(filePath);
      
      // Write file buffer to stream
      writeStream.write(file.buffer);
      writeStream.end();
      
      writeStream.on('finish', () => {
        // Return relative path to be stored in database
        resolve(`/uploads/${fileName}`);
      });
      
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Delete file from uploads directory
 * @param {String} filePath - Path to file
 * @returns {Boolean} - True if file deleted successfully
 */
exports.deleteFile = (filePath) => {
  try {
    if (!filePath) return true;
    
    const fullPath = path.join(__dirname, '../public', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};