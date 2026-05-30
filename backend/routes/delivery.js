const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const { createNotification } = require('./notifications');

// Haversine formula — returns distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// UPDATE RIDER LOCATION + availability
router.put('/location', auth, requireRole(['rider']), async (req, res) => {
  try {
    const { latitude, longitude, rider_availability } = req.body;
    const availability = rider_availability || 'available';

    if (availability === 'offline' || latitude == null) {
      // Going offline OR no coords yet — just update availability status
      await db.query(
        `UPDATE users SET rider_availability = ? WHERE id = ?`,
        [latitude == null && availability !== 'offline' ? 'available' : 'offline', req.user.id]
      );
    } else {
      await db.query(
        `UPDATE users SET latitude = ?, longitude = ?, rider_availability = ? WHERE id = ?`,
        [latitude, longitude, availability, req.user.id]
      );
    }
    res.json({ message: 'Location updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// GET AVAILABLE DELIVERIES (for riders) — sorted by distance, with radius expansion
router.get('/available', auth, requireRole(['rider']), async (req, res) => {
  try {
    // Get rider's current location
    const [riderRows] = await db.query(
      'SELECT latitude, longitude, rider_availability FROM users WHERE id = ?',
      [req.user.id]
    );
    const rider = riderRows[0];

    // If rider is offline, still return list (they may have just switched to available)
    // Block only if rider explicitly has no record in DB
    if (!rider) {
      return res.json([]);
    }

    const [rows] = await db.query(`
      SELECT d.*, o.total_amount, o.delivery_address, o.payment_method,
             o.delivery_lat, o.delivery_lng,
             i.title as item_title, i.images as item_images,
             ub.full_name as buyer_name, ub.phone as buyer_phone,
             us.full_name as seller_name, us.phone as seller_phone,
             d.pickup_address
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN items i ON o.item_id = i.id
      JOIN users ub ON o.buyer_id = ub.id
      JOIN users us ON o.seller_id = us.id
      WHERE d.status = 'pending' AND d.rider_id IS NULL
      ORDER BY d.created_at ASC
    `);

    const riderLat = parseFloat(rider.latitude);
    const riderLng = parseFloat(rider.longitude);
    const hasLocation = !isNaN(riderLat) && !isNaN(riderLng);

    // Attach distance to each delivery (null if no coords available)
    const deliveries = rows.map(d => {
      const dLat = parseFloat(d.delivery_lat);
      const dLng = parseFloat(d.delivery_lng);
      const hasDeliveryCoords = !isNaN(dLat) && !isNaN(dLng);

      let distance = null;
      if (hasLocation && hasDeliveryCoords) {
        distance = parseFloat(haversine(riderLat, riderLng, dLat, dLng).toFixed(2));
      }

      // Age of order in seconds
      const ageSeconds = (Date.now() - new Date(d.created_at).getTime()) / 1000;

      return { ...d, distance_km: distance, order_age_seconds: Math.floor(ageSeconds) };
    });

    // If rider has GPS: filter by radius (expanding over time). Otherwise show all.
    let visible = deliveries;
    if (hasLocation) {
      visible = deliveries.filter(d => {
        if (d.distance_km === null) return true; // no coords on order → always show
        const expansions = Math.floor(d.order_age_seconds / 30);
        const radius = 3 + expansions * 2; // 3km → 5km → 7km ...
        return d.distance_km <= radius;
      });
    }

    // Sort nearest first (nulls go to end)
    visible.sort((a, b) => {
      if (a.distance_km === null && b.distance_km === null) return 0;
      if (a.distance_km === null) return 1;
      if (b.distance_km === null) return -1;
      return a.distance_km - b.distance_km;
    });

    res.json(visible);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching available deliveries' });
  }
});

// ACCEPT DELIVERY (rider) — atomic, sets rider to busy
router.put('/accept/:id', auth, requireRole(['rider']), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const deliveryId = req.params.id;
    const riderId = req.user.id;

    // Lock the row
    const [deliveryRows] = await conn.query(
      "SELECT * FROM deliveries WHERE id = ? AND status = 'pending' AND rider_id IS NULL FOR UPDATE",
      [deliveryId]
    );

    if (!deliveryRows.length) {
      await conn.rollback();
      return res.status(409).json({ error: 'Delivery already taken or not available' });
    }

    // Assign rider and save accepted_at timestamp
    await conn.query(
      `UPDATE deliveries SET rider_id = ?, status = 'assigned', accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [riderId, deliveryId]
    );

    // Update order status
    await conn.query(
      `UPDATE orders SET status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [deliveryRows[0].order_id]
    );

    // Set rider to busy
    await conn.query(
      `UPDATE users SET rider_availability = 'busy' WHERE id = ?`,
      [riderId]
    );

    await conn.commit();

    // Notify buyer & seller and emit socket events
    try {
      const [orderRows] = await db.query(
        `SELECT o.buyer_id, o.seller_id, o.delivery_address, i.title as item_title, u.full_name as rider_name, u.phone as rider_phone
         FROM orders o
         JOIN items i ON o.item_id = i.id
         JOIN users u ON u.id = ?
         WHERE o.id = ?`,
        [riderId, deliveryRows[0].order_id]
      );
      if (orderRows.length) {
        const { buyer_id, seller_id, item_title, rider_name, rider_phone } = orderRows[0];
        const notifMsg = `A rider has accepted your order for "${item_title}".`;

        await createNotification(
          buyer_id,
          '🏔️ Order Accepted',
          notifMsg,
          'order_accepted',
          deliveryRows[0].order_id
        );

        await createNotification(
          seller_id,
          '🏔️ Order Accepted',
          notifMsg,
          'order_accepted',
          deliveryRows[0].order_id
        );

        const io = req.app.get('io');
        if (io) {
          const statusPayload = {
            order_id: deliveryRows[0].order_id,
            order_status: 'assigned',
            delivery_status: 'assigned',
            rider_name,
            rider_phone,
            accepted_at: new Date().toISOString()
          };

          // Emit to per-order room (legacy)
          io.to(`order_${deliveryRows[0].order_id}`).emit('delivery_status_updated', statusPayload);

          // ✨ Emit directly to buyer's private user room
          io.to(`user_${buyer_id}`).emit('ORDER_STATUS_UPDATED', {
            ...statusPayload,
            message: `🏔️ A rider has accepted your order for "${item_title}"!`
          });

          // Broadcast to riders to remove the request in real-time
          io.to('riders').emit('delivery_accepted', {
            delivery_id: deliveryId,
            order_id: deliveryRows[0].order_id
          });
        }
      }
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr.message);
    }

    res.json({ message: 'Delivery accepted successfully' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to accept delivery' });
  } finally {
    conn.release();
  }
});

// GET RIDER'S OWN DELIVERIES
router.get('/my-deliveries', auth, requireRole(['rider']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, o.total_amount, o.delivery_address, o.payment_method,
             i.title as item_title, i.description,
             ub.full_name as buyer_name, ub.phone as buyer_phone, ub.email as buyer_email,
             us.full_name as seller_name, us.phone as seller_phone
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
    res.status(500).json({ error: 'Error fetching rider deliveries' });
  }
});

// UPDATE DELIVERY STATUS (sequential: picked_up -> out_for_delivery -> delivered)
router.put('/status/:id', auth, requireRole(['rider']), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { status, notes } = req.body;
    const deliveryId = req.params.id;
    const riderId = req.user.id;

    if (!['picked_up', 'out_for_delivery', 'delivered'].includes(status)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Lock the delivery row
    const [deliveryRows] = await conn.query(
      "SELECT * FROM deliveries WHERE id = ? FOR UPDATE",
      [deliveryId]
    );

    if (!deliveryRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const delivery = deliveryRows[0];

    // Only the assigned rider can change status
    if (delivery.rider_id !== riderId) {
      await conn.rollback();
      return res.status(403).json({ error: 'You are not the assigned rider for this delivery' });
    }

    // Status changes must happen sequentially: Accept Order (assigned) -> Picked Up -> Out for Delivery -> Delivered
    const currentStatus = delivery.status;
    let isValidTransition = false;
    if (currentStatus === 'assigned' && status === 'picked_up') {
      isValidTransition = true;
    } else if (currentStatus === 'picked_up' && status === 'out_for_delivery') {
      isValidTransition = true;
    } else if (currentStatus === 'out_for_delivery' && status === 'delivered') {
      isValidTransition = true;
    }

    if (!isValidTransition) {
      await conn.rollback();
      return res.status(400).json({
        error: `Riders cannot skip steps. Invalid transition from "${currentStatus}" to "${status}".`
      });
    }

    let timeFieldUpdates = '';
    let notifTitle = '';
    let notifMessage = '';
    let notifType = '';

    if (status === 'picked_up') {
      timeFieldUpdates = ', picked_up_at = CURRENT_TIMESTAMP, pickup_time = CURRENT_TIMESTAMP';
      notifTitle = '📦 Item Picked Up';
      notifMessage = 'Your item has been picked up by the rider.';
      notifType = 'picked_up';
    } else if (status === 'out_for_delivery') {
      timeFieldUpdates = ', out_for_delivery_at = CURRENT_TIMESTAMP';
      notifTitle = '🏍️ Out for Delivery';
      notifMessage = 'Your order is on the way.';
      notifType = 'out_for_delivery';
    } else if (status === 'delivered') {
      timeFieldUpdates = ', delivered_at = CURRENT_TIMESTAMP, delivery_time = CURRENT_TIMESTAMP';
      notifTitle = '✅ Order Delivered';
      notifMessage = 'Order delivered successfully.';
      notifType = 'order_delivered';
    }

    // Update delivery status and relevant timestamp fields
    await conn.query(
      `UPDATE deliveries SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP ${timeFieldUpdates}
       WHERE id = ?`,
      [status, notes || null, deliveryId]
    );

    // Update order status
    await conn.query(
      `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, delivery.order_id]
    );

    // If delivered, set rider back to available AND execute wallet payout
    if (status === 'delivered') {
      await conn.query(
        `UPDATE users SET rider_availability = 'available' WHERE id = ?`,
        [riderId]
      );
    }

    await conn.commit();

    // Fetch updated details to broadcast real-time socket events
    const [orderRows] = await db.query(
      `SELECT o.buyer_id, o.seller_id, o.total_amount, o.delivery_fee,
              i.title as item_title, u.full_name as rider_name, u.phone as rider_phone
       FROM orders o
       JOIN items i ON o.item_id = i.id
       JOIN users u ON u.id = ?
       WHERE o.id = ?`,
      [riderId, delivery.order_id]
    );

    const [updatedDeliveryRows] = await db.query(
      "SELECT * FROM deliveries WHERE id = ?",
      [deliveryId]
    );
    const updatedDelivery = updatedDeliveryRows[0];

    if (orderRows.length) {
      const { buyer_id, seller_id, item_title, rider_name, rider_phone, total_amount, delivery_fee } = orderRows[0];

      // ── Wallet Payout on Delivery ──────────────────────────────────────────
      if (status === 'delivered') {
        try {
          // Credit seller with the item cost
          await db.query(
            `UPDATE users SET balance = balance + ? WHERE id = ?`,
            [parseFloat(total_amount) || 0, seller_id]
          );
          // Credit rider with the delivery fee
          await db.query(
            `UPDATE users SET balance = balance + ? WHERE id = ?`,
            [parseFloat(delivery_fee) || 0, riderId]
          );
          console.log(`💰 Wallet payout: seller ${seller_id} +${total_amount}, rider ${riderId} +${delivery_fee}`);
        } catch (payoutErr) {
          console.error('Wallet payout error (non-fatal):', payoutErr.message);
        }
      }

      // Toast messages per status
      const toastMessages = {
        picked_up: `📦 Your item "${item_title}" has been picked up by ${rider_name}!`,
        out_for_delivery: `🏔️ Your order "${item_title}" is on the way!`,
        delivered: `✅ Your order "${item_title}" has been delivered. Enjoy!`
      };

      // Add database notifications
      try {
        await createNotification(buyer_id, notifTitle, notifMessage, notifType, delivery.order_id);
        await createNotification(seller_id, notifTitle, notifMessage, notifType, delivery.order_id);
      } catch (notifErr) {
        console.error('Notification db logging failed:', notifErr.message);
      }

      const statusPayload = {
        order_id: delivery.order_id,
        order_status: status,
        delivery_status: status,
        rider_name,
        rider_phone,
        pickup_time: updatedDelivery.pickup_time,
        delivery_time: updatedDelivery.delivery_time,
        accepted_at: updatedDelivery.accepted_at,
        picked_up_at: updatedDelivery.picked_up_at,
        out_for_delivery_at: updatedDelivery.out_for_delivery_at,
        delivered_at: updatedDelivery.delivered_at
      };

      const io = req.app.get('io');
      if (io) {
        // Emit to order room (legacy)
        io.to(`order_${delivery.order_id}`).emit('delivery_status_updated', statusPayload);

        // ✨ Emit directly to buyer's private user room
        io.to(`user_${buyer_id}`).emit('ORDER_STATUS_UPDATED', {
          ...statusPayload,
          message: toastMessages[status] || `Status updated: ${status}`
        });
      }
    }

    res.json({ message: `Delivery marked as ${status}` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to update delivery status' });
  } finally {
    conn.release();
  }
});

// GET DELIVERY DETAILS
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*, o.total_amount, o.delivery_address, o.payment_method, o.buyer_id, o.seller_id,
             i.title as item_title,
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

    if (!rows.length) return res.status(404).json({ error: 'Delivery not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching delivery details' });
  }
});

module.exports = router;
