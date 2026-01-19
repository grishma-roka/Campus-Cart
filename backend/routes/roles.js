const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');

// GET USER ROLES
router.get('/my-roles', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, role, is_buyer, is_seller, is_rider, is_admin 
      FROM users WHERE id = ?
    `, [req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const roles = {
      primary_role: user.role,
      is_buyer: user.is_buyer,
      is_seller: user.is_seller,
      is_rider: user.is_rider,
      is_admin: user.is_admin,
      available_roles: []
    };

    // Build available roles array
    if (user.is_buyer) roles.available_roles.push('buyer');
    if (user.is_seller) roles.available_roles.push('seller');
    if (user.is_rider) roles.available_roles.push('rider');
    if (user.is_admin) roles.available_roles.push('admin');

    res.json(roles);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

// SWITCH TO SELLER MODE
router.post('/become-seller', auth, async (req, res) => {
  try {
    await db.query(
      "UPDATE users SET is_seller = TRUE WHERE id = ?",
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
router.post('/apply-rider', auth, async (req, res) => {
  try {
    const { license_number, license_issue_date, license_expiry_date, license_image } = req.body;

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

    // Create new rider request
    await db.query(`
      INSERT INTO rider_requests (user_id, license_number, license_issue_date, license_expiry_date, license_image)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, license_number, license_issue_date, license_expiry_date, license_image]);

    // Send email notification to admin
    const sendMail = require('../utils/sendEmail');
    const [userRows] = await db.query("SELECT full_name, email FROM users WHERE id = ?", [req.user.id]);
    const user = userRows[0];

    await sendMail(
      'New Rider Application - Campus Cart',
      `New rider application received:
      
Name: ${user.full_name}
Email: ${user.email}
License Number: ${license_number}
Issue Date: ${license_issue_date}
Expiry Date: ${license_expiry_date}
${license_image ? `License Image: ${license_image}` : 'No license image provided'}

Please review this application in the admin panel.

Login to admin panel: http://localhost:3000/login`
    );

    res.json({ 
      message: "Rider application submitted successfully! You will receive an email notification once reviewed by admin.",
      status: 'pending'
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