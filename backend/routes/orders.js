const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// CREATE ORDER
router.post('/create', auth, requireRole(['buyer']), async (req, res) => {
  try {
    const { item_id, quantity, delivery_address } = req.body;
    const buyer_id = req.user.id;

    // Get item details
    const [itemRows] = await db.query(
      "SELECT * FROM items WHERE id = ? AND is_available = TRUE",
      [item_id]
    );

    if (!itemRows.length) {
      return res.status(404).json({ error: "Item not available" });
    }

    const item = itemRows[0];
    const total_amount = item.price * (quantity || 1);

    // Create order
    const [result] = await db.query(`
      INSERT INTO orders (buyer_id, seller_id, item_id, quantity, total_amount, delivery_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [buyer_id, item.seller_id, item_id, quantity || 1, total_amount, delivery_address]);

    // Create delivery record
    await db.query(`
      INSERT INTO deliveries (order_id, pickup_address, delivery_address)
      VALUES (?, ?, ?)
    `, [result.insertId, 'Seller Location', delivery_address]);

    res.json({ 
      message: "Order created successfully", 
      orderId: result.insertId,
      total_amount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// GET BUYER ORDERS
router.get('/my-orders', auth, requireRole(['buyer']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.*, i.title, i.description, i.images, u.full_name as seller_name,
             d.status as delivery_status, d.pickup_time, d.delivery_time,
             ur.full_name as rider_name, ur.phone as rider_phone
      FROM orders o
      JOIN items i ON o.item_id = i.id
      JOIN users u ON o.seller_id = u.id
      LEFT JOIN deliveries d ON o.id = d.order_id
      LEFT JOIN users ur ON d.rider_id = ur.id
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching orders" });
  }
});

// GET SELLER ORDERS
router.get('/seller-orders', auth, requireRole(['seller']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT o.*, i.title, i.description, i.images, u.full_name as buyer_name, u.phone as buyer_phone,
             d.status as delivery_status, d.pickup_time, d.delivery_time,
             ur.full_name as rider_name, ur.phone as rider_phone
      FROM orders o
      JOIN items i ON o.item_id = i.id
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN deliveries d ON o.id = d.order_id
      LEFT JOIN users ur ON d.rider_id = ur.id
      WHERE o.seller_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching seller orders" });
  }
});

// CONFIRM ORDER (seller)
router.put('/confirm/:id', auth, requireRole(['seller']), async (req, res) => {
  try {
    const [result] = await db.query(`
      UPDATE orders 
      SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND seller_id = ? AND status = 'pending'
    `, [req.params.id, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found or already processed" });
    }

    res.json({ message: "Order confirmed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to confirm order" });
  }
});

// CANCEL ORDER
router.put('/cancel/:id', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Check if user is buyer or seller of this order
    const [orderRows] = await db.query(
      "SELECT * FROM orders WHERE id = ? AND (buyer_id = ? OR seller_id = ?)",
      [req.params.id, req.user.id, req.user.id]
    );

    if (!orderRows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const [result] = await db.query(`
      UPDATE orders 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status IN ('pending', 'confirmed')
    `, [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Order cannot be cancelled at this stage" });
    }

    // Cancel associated delivery
    await db.query(`
      UPDATE deliveries 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `, [req.params.id]);

    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

module.exports = router;