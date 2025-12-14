const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');

// Rider request approval
router.post('/request', auth, async (req, res) => {
  try {
    const { license_number, license_image } = req.body;

    if (!license_number || !license_image) {
      return res.status(400).json({ error: "All fields required" });
    }

    await db.query(
      "INSERT INTO rider_requests (user_id, license_number, license_image, status) VALUES (?, ?, ?, 'pending')",
      [req.user.id, license_number, license_image]
    );

    res.json({ message: "Rider request submitted for admin approval" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
