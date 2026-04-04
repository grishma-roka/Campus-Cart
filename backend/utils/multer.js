const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    // Choose subfolder based on request
    if (req.originalUrl.includes('items')) {
      uploadPath += 'items/';
    } else if (req.originalUrl.includes('profile')) {
      uploadPath += 'profiles/';
    } else {
      uploadPath += 'misc/';
    }
    
    createDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Clean filename: timestamp-originalName (no spaces)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = file.originalname.replace(/\s+/g, '_').toLowerCase();
    cb(null, uniqueSuffix + '-' + cleanName);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;
