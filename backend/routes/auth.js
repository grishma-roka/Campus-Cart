const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/* ---------------------- REGISTER ---------------------- */
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, student_id, role, license_number, license_image } = req.body;

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

    // Insert user (always as buyer/seller first, rider requires approval)
    const userRole = role === 'rider' ? 'buyer' : role; // Riders start as buyers until approved
    const [result] = await db.query(
      "INSERT INTO users (full_name, email, password, student_id, role) VALUES (?, ?, ?, ?, ?)",
      [full_name, email, hashedPassword, student_id, userRole || 'buyer']
    );

    const userId = result.insertId;

    // If user selected rider role, create rider request
    if (role === 'rider' && license_number) {
      await db.query(
        "INSERT INTO rider_requests (user_id, license_number, license_image) VALUES (?, ?, ?)",
        [userId, license_number, license_image || null]
      );

      // Send email notification to admin
      const sendMail = require('../utils/sendEmail');
      await sendMail(
        'New Rider Application - Campus Cart',
        `New rider application received during registration:
        
Name: ${full_name}
Email: ${email}
Student ID: ${student_id}
License Number: ${license_number}
${license_image ? `License Image: ${license_image}` : 'No license image provided'}

Please review this application in the admin panel.

Login to admin panel: http://localhost:3000/login
Admin Email: ${process.env.ADMIN_EMAIL}
Admin Password: password`
      );

      res.json({ 
        message: "Registration successful! Rider application submitted for admin review. You will be notified via email once approved.", 
        userId: userId,
        riderApplicationSubmitted: true
      });
    } else {
      res.json({ 
        message: "User registered successfully", 
        userId: userId 
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------------- LOGIN ---------------------- */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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
    console.error(error);
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
