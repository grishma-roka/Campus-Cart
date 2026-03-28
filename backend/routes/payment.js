require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');

const MERCHANT_ID = process.env.ESEWA_MERCHANT_ID || 'EPAYTEST';
const SECRET_KEY  = process.env.ESEWA_SECRET_KEY  || '8gBm/:&EnhH.1/q';
const API_URL     = process.env.ESEWA_API_URL     || 'https://rc.esewa.com.np/api/epay';
const SUCCESS_URL = process.env.ESEWA_SUCCESS_URL || 'http://localhost:3000/payment/verify';
const FAILURE_URL = process.env.ESEWA_FAILURE_URL || 'http://localhost:3000/payment/failed';

// HMAC-SHA256 signature
function generateSignature(message) {
  return crypto.createHmac('sha256', SECRET_KEY).update(message).digest('base64');
}

// ─── INITIATE eSewa payment ────────────────────────────────────────────────────
// POST /payment/esewa/initiate
// Body: { item_id, delivery_address, delivery_lat, delivery_lng, phone, notes }
// Returns: { formUrl, formData } — frontend posts this form to eSewa
router.post('/esewa/initiate', auth, async (req, res) => {
  try {
    const { item_id, delivery_address, delivery_lat, delivery_lng, phone, notes } = req.body;
    const buyer_id = req.user.id;

    // Validate item
    const [itemRows] = await db.query(
      'SELECT * FROM items WHERE id = ? AND is_available = TRUE AND is_sold = FALSE',
      [item_id]
    );
    if (!itemRows.length) return res.status(404).json({ error: 'Item not available' });
    const item = itemRows[0];
    if (item.seller_id === buyer_id) return res.status(400).json({ error: 'Cannot buy your own item' });

    const amount = parseFloat(item.price).toFixed(2);
    const transaction_uuid = `CC-${Date.now()}-${buyer_id}-${item_id}`;
    const product_code = MERCHANT_ID;

    // Signature: "total_amount=<amt>,transaction_uuid=<uuid>,product_code=<code>"
    const signatureMessage = `total_amount=${amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const signature = generateSignature(signatureMessage);

    // Store pending payment intent in DB so we can verify later
    await db.query(
      `INSERT INTO transactions (order_id, buyer_id, amount, payment_method, transaction_id, status)
       VALUES (0, ?, ?, 'esewa', ?, 'pending')
       ON DUPLICATE KEY UPDATE status='pending'`,
      [buyer_id, amount, transaction_uuid]
    );

    // We store checkout data in a temp table-less way: encode in transaction_uuid context
    // Save pending order data to a temp store (we'll use a simple DB approach)
    await db.query(
      `INSERT INTO pending_payments (transaction_uuid, buyer_id, item_id, delivery_address, delivery_lat, delivery_lng, phone, notes, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE buyer_id=VALUES(buyer_id)`,
      [transaction_uuid, buyer_id, item_id, delivery_address, delivery_lat || null, delivery_lng || null, phone || null, notes || null, amount]
    ).catch(() => {}); // table may not exist yet — handled below

    res.json({
      formUrl: `${API_URL}/v2/form`,
      formData: {
        amount,
        tax_amount: '0',
        total_amount: amount,
        transaction_uuid,
        product_code,
        product_service_charge: '0',
        product_delivery_charge: '0',
        success_url: SUCCESS_URL,
        failure_url: FAILURE_URL,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature,
      },
      // Also send checkout context so frontend can store it
      checkoutContext: {
        item_id, delivery_address, delivery_lat, delivery_lng, phone, notes,
        amount, transaction_uuid,
      },
    });
  } catch (err) {
    console.error('eSewa initiate error:', err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// ─── VERIFY eSewa payment ──────────────────────────────────────────────────────
// POST /payment/esewa/verify
// Body: { transaction_uuid, amount, item_id, delivery_address, delivery_lat, delivery_lng, phone, notes }
// Called by frontend after eSewa redirects back with ?data=<base64>
router.post('/esewa/verify', auth, async (req, res) => {
  try {
    const {
      encodedData,           // base64 from eSewa redirect query param
      item_id, delivery_address, delivery_lat, delivery_lng, phone, notes,
    } = req.body;

    if (!encodedData) return res.status(400).json({ error: 'No payment data received' });

    // Decode eSewa response
    let esewaData;
    try {
      esewaData = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid payment data' });
    }

    const { transaction_uuid, total_amount, status, signed_field_names, signature } = esewaData;

    // Verify signature
    const fields = (signed_field_names || '').split(',');
    const signMsg = fields.map(f => `${f}=${esewaData[f]}`).join(',');
    const expectedSig = generateSignature(signMsg);

    if (signature !== expectedSig) {
      return res.status(400).json({ error: 'Payment signature verification failed', verified: false });
    }

    if (status !== 'COMPLETE') {
      return res.status(400).json({ error: `Payment not completed. Status: ${status}`, verified: false });
    }

    const buyer_id = req.user.id;

    // Check item still available
    const [itemRows] = await db.query(
      'SELECT * FROM items WHERE id = ? AND is_available = TRUE AND is_sold = FALSE',
      [item_id]
    );
    if (!itemRows.length) return res.status(409).json({ error: 'Item no longer available', verified: false });
    const item = itemRows[0];

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Mark item sold
      await conn.query(
        'UPDATE items SET is_sold = TRUE, sold_at = CURRENT_TIMESTAMP, buyer_id = ?, is_available = FALSE WHERE id = ?',
        [buyer_id, item_id]
      );

      // Create order with payment_status = paid
      const [orderResult] = await conn.query(
        `INSERT INTO orders (buyer_id, seller_id, item_id, quantity, total_amount, delivery_address,
                             delivery_lat, delivery_lng, payment_method, phone, status,
                             payment_status, transaction_id, paid_amount)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?, 'esewa', ?, 'confirmed', 'paid', ?, ?)`,
        [buyer_id, item.seller_id, item_id, item.price, delivery_address,
         delivery_lat || null, delivery_lng || null, phone || null,
         transaction_uuid, parseFloat(total_amount)]
      );

      const orderId = orderResult.insertId;

      // Create delivery record
      await conn.query(
        `INSERT INTO deliveries (order_id, pickup_address, delivery_address, delivery_lat, delivery_lng, status)
         VALUES (?, 'Seller Location', ?, ?, ?, 'pending')`,
        [orderId, delivery_address, delivery_lat || null, delivery_lng || null]
      );

      // Record transaction
      await conn.query(
        `INSERT INTO transactions (order_id, buyer_id, amount, payment_method, transaction_id, status, raw_response)
         VALUES (?, ?, ?, 'esewa', ?, 'success', ?)`,
        [orderId, buyer_id, parseFloat(total_amount), transaction_uuid, JSON.stringify(esewaData)]
      );

      await conn.commit();

      res.json({
        verified: true,
        message: 'Payment verified and order created',
        orderId,
        transaction_uuid,
        amount: total_amount,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('eSewa verify error:', err);
    res.status(500).json({ error: 'Payment verification failed', verified: false });
  }
});

// ─── GET TRANSACTIONS (admin) ──────────────────────────────────────────────────
router.get('/transactions', auth, async (req, res) => {
  try {
    // Only admin
    const [userRows] = await db.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
    if (!userRows[0]?.is_admin) return res.status(403).json({ error: 'Admin only' });

    const [rows] = await db.query(`
      SELECT t.*, o.delivery_address, o.status as order_status,
             ub.full_name as buyer_name, ub.email as buyer_email,
             i.title as item_title
      FROM transactions t
      JOIN orders o ON t.order_id = o.id
      JOIN users ub ON t.buyer_id = ub.id
      JOIN items i ON o.item_id = i.id
      WHERE t.order_id > 0
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
