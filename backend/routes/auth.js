const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../config/upload');

const router = express.Router();

/* ---------------------- REGISTER ---------------------- */
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, student_id, role } = req.body;

    // Validate Herald College email format (stricter pattern starting with 'np')
    const emailPattern = /^np[0-9]{2}[a-z0-9]+@heraldcollege\.edu\.np$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ 
        error: "Invalid email! Please use your Herald College institutional email starting with 'np' (e.g., np03cs4a230143@heraldcollege.edu.np)" 
      });
    }

    // Check existing email
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (riders will be created as buyers first)
    const userRole = role === 'rider' ? 'buyer' : (role || 'buyer');
    const [result] = await db.query(
      "INSERT INTO users (full_name, email, password, student_id, role, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [full_name, email, hashedPassword, student_id, userRole, true]
    );

    res.json({ 
      message: "User registered successfully", 
      userId: result.insertId,
      requiresRiderApplication: role === 'rider'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- RIDER APPLICATION WITH FILE UPLOAD ---------------------- */
router.post('/register-rider', upload.single('license_image'), async (req, res) => {
  try {
    const { user_id, license_number } = req.body;
    
    console.log('🏍️ Rider application received:', { user_id, license_number, hasFile: !!req.file });
    
    // Validate user_id
    if (!user_id || user_id === 'undefined') {
      return res.status(400).json({ 
        error: "User ID is required. Please register first." 
      });
    }
    
    // Validate license number format
    const licensePattern = /^[0-9]{2}-[0-9]{2}-[0-9]{8}$/;
    if (!licensePattern.test(license_number)) {
      return res.status(400).json({ 
        error: "Invalid license format! Use format: XX-XX-XXXXXXXX (e.g., 03-06-00354234)" 
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        error: "License image is required" 
      });
    }

    const license_image = `/uploads/licenses/${req.file.filename}`;

    console.log('💾 Inserting rider request into database...');
    
    // Create rider request
    await db.query(
      "INSERT INTO rider_requests (user_id, license_number, license_image) VALUES (?, ?, ?)",
      [user_id, license_number, license_image]
    );

    console.log('✅ Rider request created successfully');

    // Send email notification to admin
    const sendMail = require('../utils/sendEmail');
    const [user] = await db.query("SELECT * FROM users WHERE id = ?", [user_id]);
    
    if (user.length > 0) {
      console.log('📧 Sending email notification to admin...');
      await sendMail(
        'New Rider Application - Campus Cart',
        `New rider application received:
        
Name: ${user[0].full_name}
Email: ${user[0].email}
Student ID: ${user[0].student_id}
License Number: ${license_number}
License Image: Uploaded successfully

Please review this application in the admin panel.

Login to admin panel: http://localhost:3000/login`
      );
      console.log('✅ Email sent successfully');
    }

    res.json({ 
      message: "Rider application submitted successfully! Admin will review and notify you via email.",
      license_image: license_image
    });

  } catch (error) {
    console.error('❌ Rider registration error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- LOGIN ---------------------- */
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt received:', { email: req.body.email });
    const { email, password } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    console.log('📊 Database query result:', rows.length > 0 ? 'User found' : 'User not found');

    if (rows.length === 0) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];
    console.log('👤 User details:', { id: user.id, email: user.email, role: user.role, is_active: user.is_active });

    // Check if user is active (only for deactivated accounts, not for pending rider applications)
    if (!user.is_active) {
      console.log('❌ Login failed: Account deactivated');
      return res.status(403).json({ 
        error: "Your account has been deactivated. Please contact admin.",
        accountDeactivated: true
      });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match:', match ? 'Yes' : 'No');
    
    if (!match) {
      console.log('❌ Login failed: Invalid password');
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log('✅ Login successful for user:', user.email);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- GET CURRENT USER ---------------------- */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      "SELECT id, full_name, email, role, student_id, phone, profile_image, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- UPDATE PROFILE ---------------------- */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const userId = req.user.id;

    await db.query(
      "UPDATE users SET full_name = ?, phone = ? WHERE id = ?",
      [full_name, phone, userId]
    );

    res.json({ message: "Profile updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
const requireRole = require('../middlewares/roleMiddleware');

// Example: only sellers can access
router.get('/seller-only', authMiddleware, requireRole(['seller']), (req, res) => {
  res.json({ message: "Hello Seller! Access granted." });
});

// Example: only riders can access
router.get('/rider-only', authMiddleware, requireRole(['rider']), (req, res) => {
  res.json({ message: "Hello Rider! Access granted." });
});

// Example: only admin can access
router.get('/admin-only', authMiddleware, requireRole(['admin']), (req, res) => {
  res.json({ message: "Hello Admin! Access granted." });
});


module.exports = router;
