const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

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

    // Allow null coords when going offline
    if (availability !== 'offline' && (latitude == null || longitude == null)) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    if (availability === 'offline' || latitude == null) {
      await db.query(
        `UPDATE users SET rider_availability = 'offline' WHERE id = ?`,
        [req.user.id]
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

    // Block offline riders or riders with no location
    if (!rider || rider.rider_availability === 'offline' || rider.latitude == null || rider.longitude == null) {
      return res.json({ locationRequired: true, deliveries: [] });
    }

    const [rows] = await db.query(`
      SELECT d.*, o.total_amount, o.delivery_address, o.payment_method,
             o.delivery_lat, o.delivery_lng,
             i.title as item_title, i.images as item_images,
             u.full_name as buyer_name, u.phone as buyer_phone
      FROM deliveries d
      JOIN orders o ON d.order_id = o.id
      JOIN items i ON o.item_id = i.id
      JOIN users u ON o.buyer_id = u.id
      WHERE d.status = 'pending' AND d.rider_id IS NULL
      ORDER BY d.created_at ASC
    `);

    const riderLat = parseFloat(rider.latitude);
    const riderLng = parseFloat(rider.longitude);
    const hasLocation = !isNaN(riderLat) && !isNaN(riderLng);

    // Attach distance to each delivery
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

    // Radius expansion: start at 3 km, expand by 2 km every 30 seconds
    // If no coords available, show all
    let visible = deliveries;
    if (hasLocation) {
      visible = deliveries.filter(d => {
        if (d.distance_km === null) return true; // no coords on order → always show
        const expansions = Math.floor(d.order_age_seconds / 30);
        const radius = 3 + expansions * 2; // 3km → 5km → 7km ...
        return d.distance_km <= radius;
      });
    }

    // Sort nearest first
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

    // Assign rider
    await conn.query(
      `UPDATE deliveries SET rider_id = ?, status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
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

// UPDATE DELIVERY STATUS (picked_up / delivered)
router.put('/status/:id', auth, requireRole(['rider']), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const deliveryId = req.params.id;

    if (!['picked_up', 'delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const timeField = status === 'picked_up' ? 'pickup_time' : 'delivery_time';

    const [result] = await db.query(
      `UPDATE deliveries SET status = ?, ${timeField} = CURRENT_TIMESTAMP, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND rider_id = ?`,
      [status, notes || null, deliveryId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const [deliveryData] = await db.query('SELECT order_id FROM deliveries WHERE id = ?', [deliveryId]);
    if (deliveryData.length) {
      await db.query(
        `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, deliveryData[0].order_id]
      );
    }

    // If delivered, set rider back to available
    if (status === 'delivered') {
      await db.query(
        `UPDATE users SET rider_availability = 'available' WHERE id = ?`,
        [req.user.id]
      );
    }

    res.json({ message: `Delivery marked as ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update delivery status' });
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
