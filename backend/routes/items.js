const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// ADD ITEM (seller only)
router.post('/add', auth, requireRole(['seller']), async (req, res) => {
  try {
    const { title, description, price, category, condition_status, is_borrowable } = req.body;

    const sellerId = req.user.id;

    const [result] = await db.query(
      `INSERT INTO items (seller_id, title, description, price, category, condition_status, is_borrowable)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sellerId, title, description, price, category, condition_status, is_borrowable]
    );

    res.json({ message: "Item added successfully", itemId: result.insertId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add item" });
  }
});

// GET ALL ITEMS (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM items ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error fetching items" });
  }
});

// GET ITEMS BY SELLER (seller only)
router.get('/my-items', auth, requireRole(['seller']), async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM items WHERE seller_id = ?", [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error fetching seller items" });
  }
});

module.exports = router;
