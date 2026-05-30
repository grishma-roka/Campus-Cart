const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer DiskStorage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'license-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads', { recursive: true });
}

// GET USER ROLES
router.get('/my-roles', auth, async (req, res) => {
  try {
    console.log(`🔍 Fetching roles for user ID: ${req.user.id}`);
    
    const [rows] = await db.query(`
      SELECT id, role, is_buyer, is_seller, is_rider, is_admin FROM users WHERE id = ?
    `, [req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    
    // Additive roles based on database boolean flags
    const roles = {
      primary_role: user.is_admin ? 'admin' : user.role,
      is_buyer: !!user.is_buyer,
      is_seller: !!user.is_seller,
      is_rider: !!user.is_rider,
      is_admin: !!user.is_admin,
      available_roles: ['buyer']
    };

    // Admin gets everything
    if (user.is_admin) {
      roles.available_roles = ['buyer', 'seller', 'rider', 'admin'];
    } else {
      if (roles.is_seller) roles.available_roles.push('seller');
      if (roles.is_rider) roles.available_roles.push('rider');
    }

    console.log(`✅ User roles: ${JSON.stringify(roles)}`);
    res.json(roles);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

// SWITCH TO SELLER MODE
router.post('/become-seller', auth, async (req, res) => {
  try {
    // For now, update BOTH the role string and the boolean flag
    await db.query(
      "UPDATE users SET role = 'seller', is_seller = TRUE WHERE id = ?",
      [req.user.id]
    );

    res.json({ 
      message: "Seller mode activated! You can now list items for sale.",
      role_added: 'seller'
    });
  } catch (error) {
    console.error('Error activating seller mode:', error);
    res.status(500).json({ error: "Failed to activate seller mode" });
  }
});

// APPLY TO BECOME RIDER
router.post('/apply-rider', auth, upload.single('license_image'), async (req, res) => {
  try {
    const { license_number, license_issue_date, license_expiry_date } = req.body;
    
    // Support file uploads directly or falback to old URL logic
    let license_image = req.body.license_image;
    if (req.file) {
      license_image = req.file.path;
    }

    // Validate required fields
    if (!license_number || !license_image) {
      return res.status(400).json({ 
        error: "License number and license image are required for rider application",
        missing_fields: {
          license_number: !license_number,
          license_image: !license_image
        }
      });
    }

    // Check if user already has a pending or approved rider request
    const [existing] = await db.query(
      "SELECT id, status FROM rider_requests WHERE user_id = ?",
      [req.user.id]
    );

    if (existing.length > 0) {
      const status = existing[0].status;
      if (status === 'pending') {
        return res.status(400).json({ 
          error: "You already have a pending rider application",
          status: 'pending'
        });
      }
      if (status === 'approved') {
        return res.status(400).json({ 
          error: "You are already an approved rider",
          status: 'approved'
        });
      }
    }

    // Create new rider request with dates
    await db.query(`
      INSERT INTO rider_requests (user_id, license_number, license_image, license_issue_date, license_expiry_date)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, license_number, license_image,
        license_issue_date || null, license_expiry_date || null]);

    // Get user details for email
    const [userRows] = await db.query("SELECT full_name, email FROM users WHERE id = ?", [req.user.id]);
    const user = userRows[0];

    // Send email notification to admin with license image
    const sendMail = require('../utils/sendEmail');
    
    try {
      await sendMail(
        'New Rider Application - Campus Cart',
        `🚚 NEW RIDER APPLICATION RECEIVED

📋 Application Details:
Name: ${user.full_name}
Email: ${user.email}
License Number: ${license_number}
${license_issue_date ? `Issue Date: ${license_issue_date}` : ''}
${license_expiry_date ? `Expiry Date: ${license_expiry_date}` : ''}

📷 License Image: ${license_image}

⚠️ IMPORTANT: Please verify the license image before approving this application.

🔗 Review Application:
Login to admin panel: http://localhost:3000/login
Admin Email: ${process.env.ADMIN_EMAIL || 'np03cs4a230143@heraldcollege.edu.np'}

Please review and approve/reject this application promptly.

Best regards,
Campus Cart System`
      );
      console.log('📧 Admin notification email sent successfully');
    } catch (emailError) {
      console.log('⚠️ Admin email sending failed:', emailError.message);
    }

    // Send confirmation email to applicant
    try {
      await sendMail(
        'Rider Application Submitted - Campus Cart',
        `Hello ${user.full_name},

✅ Your rider application has been submitted successfully!

📋 Application Details:
License Number: ${license_number}
Status: Pending Review

⏳ What happens next?
1. Admin will review your license image and details
2. You will receive an email notification once reviewed
3. If approved, you can start accepting delivery requests

📧 You will be notified at: ${user.email}

Thank you for applying to become a Campus Cart rider!

Best regards,
Campus Cart Team`
      );
      console.log('📧 Applicant confirmation email sent successfully');
    } catch (emailError) {
      console.log('⚠️ Applicant email sending failed:', emailError.message);
    }

    res.json({ 
      message: "Rider application submitted successfully! Admin has been notified and will review your license image. You will receive an email notification once reviewed.",
      status: 'pending',
      license_image_submitted: true
    });
  } catch (error) {
    console.error('Error submitting rider application:', error);
    res.status(500).json({ error: "Failed to submit rider application" });
  }
});

// GET RIDER APPLICATION STATUS
router.get('/rider-status', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT status, created_at, admin_notes 
      FROM rider_requests 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [req.user.id]);

    if (!rows.length) {
      return res.json({ status: 'not_applied' });
    }

    res.json({
      status: rows[0].status,
      applied_at: rows[0].created_at,
      admin_notes: rows[0].admin_notes
    });
  } catch (error) {
    console.error('Error fetching rider status:', error);
    res.status(500).json({ error: "Failed to fetch rider status" });
  }
});

module.exports = router;