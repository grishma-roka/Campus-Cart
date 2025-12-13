const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Approve rider
router.put(
  '/approve-rider/:id',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const userId = req.params.id;

      await db.query(
        `UPDATE users 
         SET role = 'rider', rider_status = 'approved'
         WHERE id = ? AND rider_status = 'pending'`,
        [userId]
      );

      res.json({ message: "Rider approved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;
