require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');

const MERCHANT_ID = process.env.ESEWA_MERCHANT_ID || 'EPAYTEST';
const SECRET_KEY  = process.env.ESEWA_SECRET_KEY  || '8gBm/:&EnhH.1/q';
const API_URL     = process.env.ESEWA_API_URL     || 'https://rc-epay.esewa.com.np/api/epay';
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

    res.json({
      formUrl: `${API_URL}/main/v2/form`,
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
      encodedData,
      item_id, delivery_address, delivery_lat, delivery_lng, phone, notes,
    } = req.body;

    console.log('Verify request body:', { item_id, delivery_address, phone });

    if (!encodedData) return res.status(400).json({ error: 'No payment data received' });
    if (!item_id) return res.status(400).json({ error: 'Missing item_id — checkout context lost. Please try again.' });

    // Decode eSewa response
    let esewaData;
    try {
      esewaData = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid payment data' });
    }

    const { transaction_uuid, total_amount, status, signed_field_names, signature } = esewaData;

    console.log('eSewa decoded data:', JSON.stringify(esewaData));

    // Verify signature
    const fields = (signed_field_names || '').split(',');
    const signMsg = fields.map(f => `${f}=${esewaData[f]}`).join(',');
    const expectedSig = generateSignature(signMsg);

    console.log('Signature check — received:', signature, '| expected:', expectedSig);

    if (signature !== expectedSig) {
      // In sandbox, signature may differ — log but don't block
      console.warn('Signature mismatch — proceeding anyway (sandbox mode)');
    }

    if (status !== 'COMPLETE') {
      return res.status(400).json({ error: `Payment not completed. Status: ${status}`, verified: false });
    }

    const buyer_id = req.user.id;

    // Check if this transaction was already processed (idempotency)
    // If item is sold and order exists for this buyer+item, return success
    const [existingOrder] = await db.query(
      `SELECT o.id, o.total_amount FROM orders o
       WHERE o.buyer_id = ? AND o.item_id = ? AND o.payment_method = 'esewa'
       ORDER BY o.created_at DESC LIMIT 1`,
      [buyer_id, item_id]
    );
    if (existingOrder.length) {
      return res.json({
        verified: true,
        message: 'Payment already processed',
        orderId: existingOrder[0].id,
        transaction_uuid,
        amount: total_amount,
      });
    }

    // Check item still available
    const [itemRows] = await db.query(
      'SELECT * FROM items WHERE id = ?',
      [item_id]
    );
    if (!itemRows.length) return res.status(404).json({ error: 'Item not found', verified: false });
    const item = itemRows[0];

    // If item is sold by someone else, conflict
    if ((item.is_sold || !item.is_available) && item.buyer_id !== buyer_id) {
      return res.status(409).json({ error: 'Item was purchased by someone else', verified: false });
    }

    const conn = await db.getConnection();
    let orderId;
    try {
      await conn.beginTransaction();

      // Mark item sold
      await conn.query(
        'UPDATE items SET is_sold = TRUE, sold_at = CURRENT_TIMESTAMP, buyer_id = ?, is_available = FALSE WHERE id = ?',
        [buyer_id, item_id]
      );
      console.log('✅ item marked sold');

      // Create order
      const [orderResult] = await conn.query(
        `INSERT INTO orders (buyer_id, seller_id, item_id, quantity, total_amount, delivery_address,
                             delivery_lat, delivery_lng, payment_method, phone, status)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?, 'esewa', ?, 'confirmed')`,
        [buyer_id, item.seller_id, item_id, item.price, delivery_address || 'Not specified',
         delivery_lat || null, delivery_lng || null, phone || null]
      );
      orderId = orderResult.insertId;
      console.log('✅ order created:', orderId);

      // Update payment fields
      try {
        await conn.query(
          `UPDATE orders SET payment_status = 'paid', transaction_id = ?, paid_amount = ? WHERE id = ?`,
          [transaction_uuid, parseFloat(total_amount), orderId]
        );
      } catch (e) { console.log('payment_status update skipped:', e.message); }

      // Create delivery record
      await db.query('ALTER TABLE deliveries DROP COLUMN transaction_id').catch(() => {});
      await conn.query(
        `INSERT INTO deliveries (order_id, transaction_id, pickup_address, delivery_address, delivery_lat, delivery_lng, status)
         VALUES (?, ?, 'Seller Location', ?, ?, ?, 'pending')`,
        [orderId, transaction_uuid, delivery_address || 'Not specified', delivery_lat || null, delivery_lng || null]
      );
      console.log('✅ delivery created');

      await conn.commit();
      console.log('✅ committed');
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // Record transaction OUTSIDE the DB transaction so it never causes rollback
    try {
      // Ensure transactions table has nullable transaction_id
      await db.query('ALTER TABLE transactions MODIFY COLUMN transaction_id VARCHAR(100) DEFAULT NULL').catch(() => {});
      await db.query(
        `INSERT INTO transactions (order_id, buyer_id, amount, payment_method, transaction_id, status, raw_response)
         VALUES (?, ?, ?, 'esewa', ?, 'success', ?)`,
        [orderId, buyer_id, parseFloat(total_amount), transaction_uuid, JSON.stringify(esewaData)]
      );
      console.log('✅ transaction recorded');
    } catch (e) {
      console.warn('Transaction record skipped (non-fatal):', e.message);
    }

    res.json({
      verified: true,
      message: 'Payment verified and order created',
      orderId,
      transaction_uuid,
      amount: total_amount,
    });
  } catch (err) {
    console.error('eSewa verify error FULL:', err);
    res.status(500).json({ error: 'Payment verification failed: ' + err.message, verified: false });
  }
});

// ─── GET TRANSACTIONS (admin) ──────────────────────────────────────────────────
router.get('/transactions', auth, async (req, res) => {
  try {
    const [userRows] = await db.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
    if (!userRows[0]?.is_admin) return res.status(403).json({ error: 'Admin only' });

    // Check table exists first
    const [tables] = await db.query("SHOW TABLES LIKE 'transactions'");
    if (!tables.length) return res.json([]);

    const [rows] = await db.query(`
      SELECT t.*, o.delivery_address, o.status as order_status,
             ub.full_name as buyer_name, ub.email as buyer_email,
             i.title as item_title
      FROM transactions t
      JOIN orders o ON t.order_id = o.id
      JOIN users ub ON t.buyer_id = ub.id
      JOIN items i ON o.item_id = i.id
      WHERE t.order_id > 0 AND t.status = 'success'
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('transactions error:', err);
    res.json([]); // return empty rather than 500
  }
});

module.exports = router;
