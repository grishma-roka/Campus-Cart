const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

// Approve rider
router.put('/approve-rider/:id', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    await db.query(
      "UPDATE users SET role='rider', rider_status='approved' WHERE id=?",
      [req.params.id]
    );

    res.json({ message: "Rider approved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
