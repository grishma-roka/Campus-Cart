const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// GET AVAILABLE DELIVERIES (for riders)
router.get('/available', auth, requireRole(['rider']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, o.total_amount, o.delivery_address,
             i.title as item_title, u.full_name as buyer_name, u.phone as buyer_phone
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN items i ON o.item_id = i.id
      JOIN users u ON o.buyer_id = u.id
      WHERE d.status = 'pending' AND d.rider_id IS NULL
      ORDER BY d.created_at ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching available deliveries" });
  }
});

// ACCEPT DELIVERY (rider)
router.put('/accept/:id', auth, requireRole(['rider']), async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const riderId = req.user.id;

    // Check if delivery is still available
    const [deliveryRows] = await db.query(
      "SELECT * FROM deliveries WHERE id = ? AND status = 'pending' AND rider_id IS NULL",
      [deliveryId]
    );

    if (!deliveryRows.length) {
      return res.status(404).json({ error: "Delivery not available" });
    }

    // Assign rider to delivery
    const [result] = await db.query(`
      UPDATE deliveries 
      SET rider_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending' AND rider_id IS NULL
    `, [riderId, deliveryId]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Delivery already assigned" });
    }

    // Update order status
    await db.query(`
      UPDATE orders 
      SET status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [deliveryRows[0].order_id]);

    res.json({ message: "Delivery accepted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept delivery" });
  }
});

// GET RIDER DELIVERIES
router.get('/my-deliveries', auth, requireRole(['rider']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, o.total_amount, o.delivery_address,
             i.title as item_title, i.description,
             ub.full_name as buyer_name, ub.phone as buyer_phone, ub.email as buyer_email,
             us.full_name as seller_name, us.phone as seller_phone, us.email as seller_email
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN items i ON o.item_id = i.id
      JOIN users ub ON o.buyer_id = ub.id
      JOIN users us ON o.seller_id = us.id
      WHERE d.rider_id = ?
      ORDER BY d.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching rider deliveries" });
  }
});

// UPDATE DELIVERY STATUS (rider)
router.put('/status/:id', auth, requireRole(['rider']), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const deliveryId = req.params.id;

    if (!['picked_up', 'delivered'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const timeField = status === 'picked_up' ? 'pickup_time' : 'delivery_time';
    
    const [result] = await db.query(`
      UPDATE deliveries 
      SET status = ?, ${timeField} = CURRENT_TIMESTAMP, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND rider_id = ?
    `, [status, notes, deliveryId, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Delivery not found" });
    }

    // Update order status
    const [deliveryData] = await db.query("SELECT order_id FROM deliveries WHERE id = ?", [deliveryId]);
    if (deliveryData.length > 0) {
      await db.query(`
        UPDATE orders 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, deliveryData[0].order_id]);
    }

    res.json({ message: `Delivery marked as ${status} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update delivery status" });
  }
});

// GET DELIVERY DETAILS
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, o.total_amount, o.delivery_address, o.buyer_id, o.seller_id,
             i.title as item_title, i.description,
             ub.full_name as buyer_name, ub.phone as buyer_phone,
             us.full_name as seller_name, us.phone as seller_phone,
             ur.full_name as rider_name, ur.phone as rider_phone
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN items i ON o.item_id = i.id
      JOIN users ub ON o.buyer_id = ub.id
      JOIN users us ON o.seller_id = us.id
      LEFT JOIN users ur ON d.rider_id = ur.id
      WHERE d.id = ? AND (o.buyer_id = ? OR o.seller_id = ? OR d.rider_id = ?)
    `, [req.params.id, req.user.id, req.user.id, req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Delivery not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching delivery details" });
  }
});

module.exports = router;
