const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const upload = require('../utils/multer');

// ADVANCED SEARCH ENDPOINT
router.get('/search', async (req, res) => {
  try {
    const { keyword, category, minPrice, maxPrice, condition, availability, sort } = req.query;

    let query = `
      SELECT i.*, u.full_name as seller_name,
             COALESCE(AVG(r.rating), 0) as seller_rating
      FROM items i
      JOIN users u ON i.seller_id = u.id
      LEFT JOIN ratings r ON r.rated_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Availability filter (default: only available)
    if (availability === 'sold') {
      query += ' AND i.is_sold = TRUE';
    } else {
      query += ' AND i.is_sold = FALSE AND i.is_available = TRUE';
    }

    if (keyword) {
      query += ' AND (i.title LIKE ? OR i.description LIKE ? OR i.category LIKE ? OR u.full_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }

    if (category) {
      query += ' AND i.category = ?';
      params.push(category);
    }

    if (minPrice) {
      query += ' AND i.price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ' AND i.price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (condition) {
      query += ' AND i.condition_status = ?';
      params.push(condition);
    }

    query += ' GROUP BY i.id';

    switch (sort) {
      case 'price_low':  query += ' ORDER BY i.price ASC'; break;
      case 'price_high': query += ' ORDER BY i.price DESC'; break;
      case 'oldest':     query += ' ORDER BY i.created_at ASC'; break;
      default:           query += ' ORDER BY i.created_at DESC';
    }

    const [rows] = await db.query(query, params);
    res.json({ results: rows, count: rows.length });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ADD ITEM (seller only) — UPDATED TO LOCALHOST FOR IMAGE LOADS
router.post('/add', auth, requireRole(['seller']), upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category, condition_status, pickup_location } = req.body;
    const sellerId = req.user.id;
    
    // Convert the Multer file object into a valid localhost HTTP address
    let imagesValue = '[]';
    if (req.file) {
      const localImageUrl = `${req.protocol}://${req.get('host')}/uploads/items/${req.file.filename}`;
      imagesValue = JSON.stringify([localImageUrl]);
    }

    // Validate Other Inputs
    if (!title || !price || !category) {
      return res.status(400).json({ error: "Title, price, and category are required" });
    }

    const transaction_type = req.body.transaction_type || 'buy';
    const is_borrowable_val = transaction_type === 'borrow' ? 1 : 0;

    // Database Operation
    const [result] = await db.query(
      `INSERT INTO items (seller_id, title, description, price, category, condition_status, is_borrowable, images, transaction_type, pickup_location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sellerId, title, description, parseFloat(price), category, condition_status || 'good', 
        is_borrowable_val,
        imagesValue,
        transaction_type,
        pickup_location || null
      ]
    );

    console.log('✅ Item added successfully:', result.insertId);
    res.json({ message: "Item added successfully", itemId: result.insertId });

  } catch (err) {
    console.error('❌ SQL Error:', err);
    res.status(500).json({ error: "Failed to add item: " + err.message });
  }
});

// GET ALL ITEMS (public)
router.get('/', async (req, res) => {
  try {
    console.log('📦 Fetching items...');
    const { category, search, is_borrowable, min_price, max_price, sort_by } = req.query;
    console.log(`🔍 Filters: category=${category}, search=${search}, price=${min_price}-${max_price}, sort=${sort_by}`);
    
    let query = `
      SELECT i.*, u.full_name as seller_name, u.email as seller_email,
             COALESCE(AVG(r.rating), 0) as seller_rating
      FROM items i 
      JOIN users u ON i.seller_id = u.id 
      LEFT JOIN ratings r ON r.rated_user_id = u.id
      WHERE i.is_available = TRUE 
        AND i.is_sold = FALSE 
        AND (i.transaction_type = 'buy' OR i.transaction_type IS NULL)
        AND i.is_borrowable = 0
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
      const isBorrowableVal = is_borrowable === 'true' || is_borrowable === true;
      if (isBorrowableVal) {
        query = query.replace('AND i.is_borrowable = FALSE', 'AND i.is_borrowable = TRUE');
      }
    }

    if (min_price) {
      query += ' AND i.price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price && max_price !== 'above') {
      query += ' AND i.price <= ?';
      params.push(parseFloat(max_price));
    }

    query += ' GROUP BY i.id';

    switch (sort_by) {
      case 'price_low':   query += ' ORDER BY i.price ASC'; break;
      case 'price_high':  query += ' ORDER BY i.price DESC'; break;
      case 'newest':      query += ' ORDER BY i.created_at DESC'; break;
      case 'oldest':      query += ' ORDER BY i.created_at ASC'; break;
      case 'rating':      query += ' ORDER BY seller_rating DESC'; break;
      default:            query += ' ORDER BY i.created_at DESC';
    }

    const [rows] = await db.query(query, params);
    console.log(`✅ Found ${rows.length} items - sending to frontend`);
    
    if (rows.length > 0) {
      console.log(`📦 Sample item: ${rows[0].title} - रू${rows[0].price}`);
    }
    
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching items:', err);
    res.status(500).json({ error: "Error fetching items" });
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

// UPDATE ITEM (seller only) — UPDATED TO LOCALHOST FOR IMAGE LOADS
router.put('/:id', auth, requireRole(['seller']), upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category, condition_status, is_available, borrow_price_per_day, max_borrow_days } = req.body;
    const transaction_type = req.body.transaction_type || (req.body.is_borrowable === 'true' || req.body.is_borrowable === true ? 'borrow' : 'buy');
    const is_borrowable_val = transaction_type === 'borrow' ? 1 : 0;
    
    let query = `
      UPDATE items SET title = ?, description = ?, price = ?, category = ?, 
      condition_status = ?, is_borrowable = ?, borrow_price_per_day = ?, 
      max_borrow_days = ?, is_available = ?, transaction_type = ?, updated_at = CURRENT_TIMESTAMP
    `;
    let params = [
      title, description, parseFloat(price), category, condition_status, 
      is_borrowable_val, 
      borrow_price_per_day || 0, max_borrow_days || 0, 
      is_available === 'true' || is_available === true || is_available === 1,
      transaction_type
    ];

    if (req.file) {
      const localImageUrl = `${req.protocol}://${req.get('host')}/uploads/items/${req.file.filename}`;
      query += `, images = ?`;
      params.push(JSON.stringify([localImageUrl]));
    }

    query += ` WHERE id = ? AND seller_id = ?`;
    params.push(req.params.id, req.user.id);

    const [result] = await db.query(query, params);

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