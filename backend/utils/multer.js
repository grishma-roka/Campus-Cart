const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Setup the dynamic Local Disk storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subFolder = 'misc';

    // Perfectly matching your original URL sorting rules
    if (req.originalUrl.includes('items')) {
      subFolder = 'items';
    } else if (req.originalUrl.includes('profile') || req.originalUrl.includes('avatar')) {
      subFolder = 'profiles';
    } else if (req.originalUrl.includes('rider') || req.originalUrl.includes('license') || req.originalUrl.includes('apply')) {
      subFolder = 'licenses';
    } else if (req.originalUrl.includes('chat') || req.originalUrl.includes('message') || req.originalUrl.includes('send')) {
      subFolder = 'chat';
    } else if (req.originalUrl.includes('borrow')) {
      subFolder = 'borrow';
    }

    // path.join goes up from 'backend/utils' to 'backend', then into 'uploads/<subFolder>'
    const uploadDir = path.join(__dirname, '../uploads', subFolder);
    
    // Safety check: automatically create the local folder structure if it doesn't exist yet
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Perfectly matching your original clean cloud naming convention locally
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = file.originalname.replace(/\s+/g, '_').toLowerCase().split('.')[0];
    cb(null, `${uniqueSuffix}-${cleanName}${path.extname(file.originalname).toLowerCase()}`);
  }
});

// 2. Keep your original image-only check
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// 3. Export the configured local upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;