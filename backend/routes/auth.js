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

    // If user selected rider role, create as inactive user pending approval
    if (role === 'rider' && license_number) {
      // Create user as inactive rider applicant
      const [result] = await db.query(
        "INSERT INTO users (full_name, email, password, student_id, role, is_active) VALUES (?, ?, ?, ?, ?, ?)",
        [full_name, email, hashedPassword, student_id, 'rider_applicant', false]
      );

      const userId = result.insertId;

      // Create rider request
      await db.query(
        "INSERT INTO rider_requests (user_id, license_number, license_image) VALUES (?, ?, ?)",
        [userId, license_number, license_image || null]
      );

      // Send email notification to admin
      const sendMail = require('../utils/sendEmail');
      await sendMail(
        'New Rider Application - Campus Cart',
        `New rider application received:
        
Name: ${full_name}
Email: ${email}
Student ID: ${student_id}
License Number: ${license_number}
${license_image ? `License Image: ${license_image}` : 'No license image provided'}

Please review this application in the admin panel.

Login to admin panel: http://localhost:3000/login
Admin Email: ${process.env.ADMIN_EMAIL}
Admin Password: password

Note: The applicant cannot login until you approve their rider application.`
      );

      res.json({ 
        message: "Rider application submitted successfully! You cannot login until admin approves your application. You will receive an email notification once approved.", 
        userId: userId,
        riderApplicationSubmitted: true,
        loginBlocked: true
      });
    } else {
      // Regular user registration (buyer/seller)
      const [result] = await db.query(
        "INSERT INTO users (full_name, email, password, student_id, role) VALUES (?, ?, ?, ?, ?)",
        [full_name, email, hashedPassword, student_id, role || 'buyer']
      );

      res.json({ 
        message: "User registered successfully", 
        userId: result.insertId 
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

    // Check if user is active
    if (!user.is_active) {
      if (user.role === 'rider_applicant') {
        return res.status(403).json({ 
          error: "Your rider application is pending admin approval. You cannot login until approved.",
          pendingApproval: true
        });
      } else {
        return res.status(403).json({ 
          error: "Your account has been deactivated. Please contact admin.",
          accountDeactivated: true
        });
      }
    }

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
