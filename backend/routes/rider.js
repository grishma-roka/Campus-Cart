const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply to become rider
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const { license_number } = req.body;

    await db.query(
      "UPDATE users SET rider_status='pending', license_number=? WHERE id=?",
      [license_number, req.user.id]
    );

    res.json({
      message: "Rider application submitted. Waiting for admin approval."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
