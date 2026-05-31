const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const { estimateDelivery } = require('../utils/fareEstimator');

// ── DELIVERY FEE ESTIMATE (call before placing order) ─────────────────────────
// GET /api/orders/estimate-fee?pickup_location=...&delivery_address=...
router.get('/estimate-fee', auth, async (req, res) => {
  try {
    const { pickup_location, delivery_address } = req.query;
    const estimate = estimateDelivery(pickup_location || '', delivery_address || '');
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: 'Failed to estimate fee' });
  }
});

// CREATE ORDER (BUY ITEM)
router.post('/create', auth, async (req, res) => {
  try {
    const { item_id, delivery_address, delivery_lat, delivery_lng, payment_method, phone, notes } = req.body;
    const buyer_id = req.user.id;

    // Get item details with lock to prevent race conditions
    const [itemRows] = await db.query(
      "SELECT * FROM items WHERE id = ? AND is_available = TRUE AND is_sold = FALSE",
      [item_id]
    );

    if (!itemRows.length) {
      return res.status(404).json({ error: "Item not available or already sold" });
    }

    const item = itemRows[0];

    if (item.seller_id === buyer_id) {
      return res.status(400).json({ error: "You cannot buy your own item" });
    }

    const total_amount = item.price;
    const pm = payment_method || 'cod';

    // ── Compute delivery fee ─────────────────────────────────────────────
    const pickupLocation = item.pickup_location || 'Campus';
    const { distance_km, delivery_fee } = estimateDelivery(pickupLocation, delivery_address || '');

    // Update item as unavailable, but NOT sold yet (awaiting rider acceptance)
    await db.query(`
      UPDATE items 
      SET buyer_id = ?, is_available = FALSE
      WHERE id = ?
    `, [buyer_id, item_id]);

    // Create order — store coords + payment method + delivery_fee
    const [result] = await db.query(`
      INSERT INTO orders (buyer_id, seller_id, item_id, quantity, total_amount, delivery_address,
                          delivery_lat, delivery_lng, payment_method, phone, status, delivery_fee)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
    `, [buyer_id, item.seller_id, item_id, total_amount, delivery_address,
        delivery_lat || null, delivery_lng || null, pm, phone || null, delivery_fee]);

    // Get seller info for pickup address
    const [sellerRows] = await db.query("SELECT full_name, phone FROM users WHERE id = ?", [item.seller_id]);
    const sellerName = sellerRows[0]?.full_name || 'Seller';
    const sellerPhone = sellerRows[0]?.phone || 'N/A';

    // Create delivery record with coords and fee
    await db.query(`
      INSERT INTO deliveries (order_id, pickup_address, delivery_address, delivery_lat, delivery_lng, delivery_fee)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [result.insertId, pickupLocation, delivery_address, delivery_lat || null, delivery_lng || null, delivery_fee]);

    // Get buyer info
    const [buyerRows] = await db.query("SELECT full_name FROM users WHERE id = ?", [buyer_id]);
    const buyerName = buyerRows[0]?.full_name || 'A buyer';

    // Notify seller that their item was ordered
    try {
      await db.query(
        "INSERT INTO notifications (user_id, title, message, type, order_id) VALUES (?, ?, ?, ?, ?)",
        [
          item.seller_id,
          '🛒 New Order Received!',
          `${buyerName} has placed an order for "${item.title}". Delivery fee: Rs. ${delivery_fee} (${distance_km} km). Go to your seller dashboard to search for a rider.`,
          'new_order',
          result.insertId
        ]
      );
    } catch (e) {
      console.error('Seller notification failed (non-fatal):', e.message);
    }

    // Notify buyer
    try {
      await db.query(
        "INSERT INTO notifications (user_id, title, message, type, order_id) VALUES (?, ?, ?, ?, ?)",
        [
          buyer_id,
          '📦 Order Placed!',
          `You placed an order for "${item.title}". Delivery fee: Rs. ${delivery_fee}. We'll notify you when a rider picks it up.`,
          'order_placed',
          result.insertId
        ]
      );
    } catch (e) {
      console.error('Buyer notification failed (non-fatal):', e.message);
    }

    // Notify all active riders with a real-time NEW_DELIVERY_JOB broadcast
    try {
      const [riders] = await db.query(
        "SELECT id, full_name FROM users WHERE (role = 'rider' OR is_rider = 1) AND is_active = TRUE"
      );

      for (const rider of riders) {
        await db.query(
          "INSERT INTO notifications (user_id, title, message, type, order_id) VALUES (?, ?, ?, ?, ?)",
          [
            rider.id,
            '🛵 New Delivery Job!',
            `Order: "${item.title}"\nPickup: ${pickupLocation}\nDeliver to: ${delivery_address}\nBuyer: ${buyerName}\nItem: Rs. ${total_amount} | Delivery Fee: Rs. ${delivery_fee}\n\nOpen your Rider Dashboard to accept!`,
            'new_delivery',
            result.insertId
          ]
        );
      }

      const io = req.app.get('io');
      if (io) {
        io.to('riders').emit('NEW_DELIVERY_JOB', {
          order_id: result.insertId,
          product_name: item.title,
          buyer_name: buyerName,
          seller_name: sellerName,
          pickup_location: pickupLocation,
          delivery_location: delivery_address,
          payment_method: pm,
          order_amount: total_amount,
          delivery_fee,
          distance_km
        });
      }
    } catch (e) {
      console.error('Riders notification failed (non-fatal):', e.message);
    }

    console.log(`✅ Item ${item_id} sold to buyer ${buyer_id}, delivery_fee=Rs.${delivery_fee}`);

    res.json({ 
      message: "Item purchased successfully!", 
      orderId: result.insertId,
      total_amount,
      delivery_fee,
      distance_km,
      item_title: item.title
    });

  } catch (err) {
    console.error('❌ Purchase error:', err);
    res.status(500).json({ error: "Failed to purchase item", details: err.message });
  }
});

// GET BUYER ORDERS
router.get('/my-orders', auth, async (req, res) => {
  try {
    console.log('🛒 Fetching buyer orders...');
    const [rows] = await db.query(`
      SELECT o.*, i.title, i.description, i.images, u.full_name as seller_name
      FROM orders o
      JOIN items i ON o.item_id = i.id
      JOIN users u ON o.seller_id = u.id
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    // Add delivery and rider info separately to avoid join issues
    for (let order of rows) {
      try {
        const [deliveryInfo] = await db.query(`
          SELECT d.pickup_time, d.delivery_time, d.status as delivery_status,
                 ur.full_name as rider_name, ur.phone as rider_phone
          FROM deliveries d
          LEFT JOIN users ur ON d.rider_id = ur.id
          WHERE d.order_id = ?
          LIMIT 1
        `, [order.id]);
        
        if (deliveryInfo.length > 0) {
          order.delivery_status = deliveryInfo[0].delivery_status || 'pending';
          order.pickup_time = deliveryInfo[0].pickup_time;
          order.delivery_time = deliveryInfo[0].delivery_time;
          order.rider_name = deliveryInfo[0].rider_name;
          order.rider_phone = deliveryInfo[0].rider_phone;
        } else {
          order.delivery_status = 'pending';
          order.pickup_time = null;
          order.delivery_time = null;
          order.rider_name = null;
          order.rider_phone = null;
        }
      } catch (err) {
        console.log('⚠️ Delivery info error for order', order.id, ':', err.message);
        order.delivery_status = 'pending';
        order.pickup_time = null;
        order.delivery_time = null;
        order.rider_name = null;
        order.rider_phone = null;
      }
    }

    console.log(`✅ Found ${rows.length} orders for buyer`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching buyer orders:', err);
    res.status(500).json({ error: "Error fetching orders" });
  }
});

// GET SELLER ORDERS
router.get('/seller-orders', auth, requireRole(['seller']), async (req, res) => {
  try {
    console.log('🏪 Fetching seller orders...');
    const [rows] = await db.query(`
      SELECT o.*, i.title, i.description, i.images, u.full_name as buyer_name, u.phone as buyer_phone
      FROM orders o
      JOIN items i ON o.item_id = i.id
      JOIN users u ON o.buyer_id = u.id
      WHERE o.seller_id = ?
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    // Add delivery and rider info separately to avoid join issues
    for (let order of rows) {
      try {
        const [deliveryInfo] = await db.query(`
          SELECT d.pickup_time, d.delivery_time, d.status as delivery_status,
                 ur.full_name as rider_name, ur.phone as rider_phone
          FROM deliveries d
          LEFT JOIN users ur ON d.rider_id = ur.id
          WHERE d.order_id = ?
          LIMIT 1
        `, [order.id]);
        
        if (deliveryInfo.length > 0) {
          order.delivery_status = deliveryInfo[0].delivery_status || 'pending';
          order.pickup_time = deliveryInfo[0].pickup_time;
          order.delivery_time = deliveryInfo[0].delivery_time;
          order.rider_name = deliveryInfo[0].rider_name;
          order.rider_phone = deliveryInfo[0].rider_phone;
        } else {
          order.delivery_status = 'pending';
          order.pickup_time = null;
          order.delivery_time = null;
          order.rider_name = null;
          order.rider_phone = null;
        }
      } catch (err) {
        console.log('⚠️ Delivery info error for order', order.id, ':', err.message);
        order.delivery_status = 'pending';
        order.pickup_time = null;
        order.delivery_time = null;
        order.rider_name = null;
        order.rider_phone = null;
      }
    }

    console.log(`✅ Found ${rows.length} orders for seller`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching seller orders:', err);
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

    // Make the item available in the shop again since the order was cancelled before a rider accepted it
    await db.query(`
      UPDATE items 
      SET is_available = TRUE, buyer_id = NULL, is_sold = FALSE, sold_at = NULL
      WHERE id = ?
    `, [orderRows[0].item_id]);

    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

// READY FOR PICKUP — seller marks item as ready, notifies all riders
router.post('/ready-for-pickup/:orderId', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Verify this order belongs to the seller
    const [orderRows] = await db.query(
      `SELECT o.*, i.title as item_title, u.full_name as buyer_name, u.phone as buyer_phone
       FROM orders o
       JOIN items i ON o.item_id = i.id
       JOIN users u ON o.buyer_id = u.id
       WHERE o.id = ? AND o.seller_id = ?`,
      [orderId, req.user.id]
    );

    if (!orderRows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRows[0];

    // Get seller info for pickup address
    const [sellerRows] = await db.query("SELECT full_name, phone FROM users WHERE id = ?", [req.user.id]);
    const sellerName = sellerRows[0]?.full_name || 'Seller';
    const sellerPhone = sellerRows[0]?.phone || 'N/A';

    // Ensure a pending delivery record exists so riders can see & accept it
    const [existingDelivery] = await db.query(
      "SELECT id FROM deliveries WHERE order_id = ?",
      [orderId]
    );
    if (existingDelivery.length === 0) {
      await db.query(
        `INSERT INTO deliveries (order_id, pickup_address, delivery_address, status, delivery_fee)
         VALUES (?, ?, ?, 'pending', 50)`,
        [orderId, `${sellerName} (Campus Cart Seller)`, order.delivery_address]
      );
    } else {
      // Reset to pending if it was previously cancelled/stale
      await db.query(
        "UPDATE deliveries SET status = 'pending', rider_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status IN ('cancelled', 'pending')",
        [orderId]
      );
    }

    // Update order status to 'confirmed' so it becomes searchable
    await db.query(
      "UPDATE orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'",
      [orderId]
    );

    // Find ALL active riders (regardless of their current availability status)
    const [riders] = await db.query(
      "SELECT id, full_name FROM users WHERE (role = 'rider' OR is_rider = 1) AND is_active = TRUE"
    );

    if (riders.length === 0) {
      return res.json({ message: 'No riders are registered on Campus Cart yet.', notified: 0 });
    }

    // Notify every active rider
    for (const rider of riders) {
      await db.query(
        "INSERT INTO notifications (user_id, title, message, type, order_id) VALUES (?, ?, ?, ?, ?)",
        [
          rider.id,
          '📦 Item Ready for Pickup!',
          `"${order.item_title}" is packed and ready.\nPickup from: ${sellerName} (${sellerPhone})\nDeliver to: ${order.delivery_address}\nBuyer: ${order.buyer_name} (${order.buyer_phone || 'N/A'})\nAmount: रू ${order.total_amount}\n\nOpen your Rider Dashboard to accept!`,
          'new_delivery',
          orderId
        ]
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.to('riders').emit('NEW_DELIVERY_JOB', {
        order_id: orderId,
        product_name: order.item_title,
        buyer_name: order.buyer_name,
        seller_name: sellerName,
        pickup_location: `${sellerName} (Campus Cart Seller)`,
        delivery_location: order.delivery_address,
        payment_method: order.payment_method,
        order_amount: order.total_amount,
        delivery_fee: order.delivery_fee || 40
      });
    }

    res.json({ message: `Notified ${riders.length} rider(s)!`, notified: riders.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search for riders' });
  }
});

module.exports = router;