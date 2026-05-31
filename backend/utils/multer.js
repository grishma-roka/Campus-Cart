const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Connect to your Cloudinary account
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Setup the dynamic Cloudinary storage configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    // This function replaces your old destination logic!
    folder: (req, file) => {
      if (req.originalUrl.includes('items')) {
        return 'campus_cart/items';
      } else if (req.originalUrl.includes('profile') || req.originalUrl.includes('avatar')) {
        return 'campus_cart/profiles';
      } else if (req.originalUrl.includes('rider') || req.originalUrl.includes('license') || req.originalUrl.includes('apply')) {
        return 'campus_cart/licenses';
      } else if (req.originalUrl.includes('chat') || req.originalUrl.includes('message') || req.originalUrl.includes('send')) {
        return 'campus_cart/chat';
      } else if (req.originalUrl.includes('borrow')) {
        return 'campus_cart/borrow';
      } else {
        return 'campus_cart/misc';
      }
    },
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id: (req, file) => {
      // Create a clean, unique file name
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const cleanName = file.originalname.replace(/\s+/g, '_').toLowerCase().split('.')[0];
      return `${uniqueSuffix}-${cleanName}`;
    }
  }
});

// 3. Keep your original image-only check
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// 4. Export the configured upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;