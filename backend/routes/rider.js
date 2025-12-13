const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply to become rider
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { license_number } = req.body;

    await db.query(
      `UPDATE users 
       SET rider_status = 'pending'
       WHERE id = ?`,
      [userId]
    );

    res.json({ message: "Rider application submitted. Waiting for admin approval." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
