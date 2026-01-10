const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// ADD ITEM (seller only)
router.post('/add', auth, requireRole(['seller']), async (req, res) => {
  try {
    const { title, description, price, category, condition_status, is_borrowable, borrow_price_per_day, max_borrow_days } = req.body;

    const sellerId = req.user.id;

    const [result] = await db.query(
      `INSERT INTO items (seller_id, title, description, price, category, condition_status, is_borrowable, borrow_price_per_day, max_borrow_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sellerId, title, description, price, category, condition_status, is_borrowable, borrow_price_per_day || 0, max_borrow_days || 7]
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
    console.log('📦 Fetching items...');
    const { category, search, is_borrowable } = req.query;
    let query = `
      SELECT i.*, u.full_name as seller_name, u.email as seller_email,
             COALESCE(AVG(r.rating), 0) as seller_rating
      FROM items i 
      JOIN users u ON i.seller_id = u.id 
      LEFT JOIN ratings r ON r.rated_user_id = u.id
      WHERE i.is_available = TRUE
    `;
    const params = [];

    if (category) {
      query += ' AND i.category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (i.title LIKE ? OR i.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (is_borrowable !== undefined) {
      query += ' AND i.is_borrowable = ?';
      params.push(is_borrowable === 'true');
    }

    query += ' GROUP BY i.id ORDER BY i.created_at DESC';

    const [rows] = await db.query(query, params);
    console.log(`✅ Found ${rows.length} items`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching items:', err);
    res.status(500).json({ error: "Error fetching items" });
  }
});

// GET SINGLE ITEM
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, u.full_name as seller_name, u.email as seller_email, u.phone as seller_phone,
             COALESCE(AVG(r.rating), 0) as seller_rating, COUNT(r.id) as rating_count
      FROM items i 
      JOIN users u ON i.seller_id = u.id 
      LEFT JOIN ratings r ON r.rated_user_id = u.id
      WHERE i.id = ?
      GROUP BY i.id
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching item" });
  }
});

// GET ITEMS BY SELLER (seller only)
router.get('/my-items', auth, requireRole(['seller']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.*, 
             COUNT(DISTINCT o.id) as total_orders,
             COUNT(DISTINCT br.id) as total_borrows
      FROM items i 
      LEFT JOIN orders o ON i.id = o.item_id
      LEFT JOIN borrow_requests br ON i.id = br.item_id
      WHERE i.seller_id = ?
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching seller items" });
  }
});

// UPDATE ITEM (seller only)
router.put('/:id', auth, requireRole(['seller']), async (req, res) => {
  try {
    const { title, description, price, category, condition_status, is_borrowable, borrow_price_per_day, max_borrow_days, is_available } = req.body;

    const [result] = await db.query(
      `UPDATE items SET title = ?, description = ?, price = ?, category = ?, 
       condition_status = ?, is_borrowable = ?, borrow_price_per_day = ?, 
       max_borrow_days = ?, is_available = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND seller_id = ?`,
      [title, description, price, category, condition_status, is_borrowable, 
       borrow_price_per_day, max_borrow_days, is_available, req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found or unauthorized" });
    }

    res.json({ message: "Item updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// DELETE ITEM (seller only)
router.delete('/:id', auth, requireRole(['seller']), async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM items WHERE id = ? AND seller_id = ?",
      [req.params.id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item not found or unauthorized" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

module.exports = router;
