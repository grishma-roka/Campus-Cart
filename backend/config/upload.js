const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure local disk storage with dynamic folder sorting
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let subFolder = 'misc';

        // Replicating your original URL-matching logic for local folders
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

        // Build path: backend/uploads/<subFolder>
        // Note: '..' goes up from 'backend/config/' to 'backend/' folder
        const uploadDir = path.join(__dirname, '../uploads', subFolder);
        
        // Safety check to automatically create the folder structure if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Replicating your clean, unique cloud naming convention locally
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const cleanName = file.originalname.replace(/\s+/g, '_').toLowerCase().split('.')[0];
        cb(null, `${uniqueSuffix}-${cleanName}${path.extname(file.originalname).toLowerCase()}`);
    }
});

// Keep your original image-only validation check
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Export the configured local upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

module.exports = upload;