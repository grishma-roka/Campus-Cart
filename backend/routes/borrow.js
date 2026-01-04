const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

// CREATE BORROW REQUEST
router.post('/request', auth, requireRole(['buyer']), async (req, res) => {
  try {
    const { item_id, start_date, end_date, message } = req.body;
    const borrower_id = req.user.id;

    // Get item details
    const [itemRows] = await db.query(
      "SELECT * FROM items WHERE id = ? AND is_borrowable = TRUE AND is_available = TRUE",
      [item_id]
    );

    if (!itemRows.length) {
      return res.status(404).json({ error: "Item not available for borrowing" });
    }

    const item = itemRows[0];
    
    // Calculate days and cost
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const totalCost = totalDays * item.borrow_price_per_day;

    if (totalDays > item.max_borrow_days) {
      return res.status(400).json({ error: `Maximum borrow period is ${item.max_borrow_days} days` });
    }

    // Check for overlapping requests
    const [overlapping] = await db.query(`
      SELECT id FROM borrow_requests 
      WHERE item_id = ? AND status IN ('approved', 'active') 
      AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))
    `, [item_id, start_date, start_date, end_date, end_date]);

    if (overlapping.length > 0) {
      return res.status(400).json({ error: "Item is not available for the selected dates" });
    }

    const [result] = await db.query(`
      INSERT INTO borrow_requests (item_id, borrower_id, seller_id, start_date, end_date, total_days, total_cost, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [item_id, borrower_id, item.seller_id, start_date, end_date, totalDays, totalCost, message]);

    res.json({ 
      message: "Borrow request submitted successfully", 
      requestId: result.insertId,
      totalCost,
      totalDays
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create borrow request" });
  }
});

// GET BORROW REQUESTS FOR BORROWER
router.get('/my-requests', auth, requireRole(['buyer']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT br.*, i.title, i.description, i.images, u.full_name as seller_name, u.email as seller_email
      FROM borrow_requests br
      JOIN items i ON br.item_id = i.id
      JOIN users u ON br.seller_id = u.id
      WHERE br.borrower_id = ?
      ORDER BY br.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching borrow requests" });
  }
});

// GET BORROW REQUESTS FOR SELLER
router.get('/seller-requests', auth, requireRole(['seller']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT br.*, i.title, i.description, i.images, u.full_name as borrower_name, u.email as borrower_email, u.phone as borrower_phone
      FROM borrow_requests br
      JOIN items i ON br.item_id = i.id
      JOIN users u ON br.borrower_id = u.id
      WHERE br.seller_id = ?
      ORDER BY br.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching borrow requests" });
  }
});

// APPROVE/REJECT BORROW REQUEST (seller only)
router.put('/respond/:id', auth, requireRole(['seller']), async (req, res) => {
  try {
    const { status, admin_notes } = req.body; // status: 'approved' or 'rejected'
    const requestId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [result] = await db.query(`
      UPDATE borrow_requests 
      SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND seller_id = ?
    `, [status, admin_notes, requestId, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Borrow request not found" });
    }

    // If approved, mark item as temporarily unavailable
    if (status === 'approved') {
      const [requestData] = await db.query("SELECT item_id FROM borrow_requests WHERE id = ?", [requestId]);
      if (requestData.length > 0) {
        await db.query("UPDATE items SET is_available = FALSE WHERE id = ?", [requestData[0].item_id]);
      }
    }

    res.json({ message: `Borrow request ${status} successfully` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to respond to borrow request" });
  }
});

// START BORROWING (mark as active)
router.put('/start/:id', auth, requireRole(['seller']), async (req, res) => {
  try {
    const { condition_before, images_before } = req.body;
    const requestId = req.params.id;

    // Update borrow request status
    const [result] = await db.query(`
      UPDATE borrow_requests 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND seller_id = ? AND status = 'approved'
    `, [requestId, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Approved borrow request not found" });
    }

    // Record initial condition
    await db.query(`
      INSERT INTO item_conditions (borrow_request_id, condition_before, images_before)
      VALUES (?, ?, ?)
    `, [requestId, condition_before, JSON.stringify(images_before || [])]);

    res.json({ message: "Borrowing started successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start borrowing" });
  }
});

// RETURN ITEM
router.put('/return/:id', auth, requireRole(['seller']), async (req, res) => {
  try {
    const { condition_after, images_after, damage_reported, damage_description, refund_amount } = req.body;
    const requestId = req.params.id;

    // Update borrow request status
    const [result] = await db.query(`
      UPDATE borrow_requests 
      SET status = 'returned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND seller_id = ? AND status = 'active'
    `, [requestId, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Active borrow request not found" });
    }

    // Update condition record
    await db.query(`
      UPDATE item_conditions 
      SET condition_after = ?, images_after = ?, damage_reported = ?, damage_description = ?, refund_amount = ?
      WHERE borrow_request_id = ?
    `, [condition_after, JSON.stringify(images_after || []), damage_reported, damage_description, refund_amount || 0, requestId]);

    // Make item available again
    const [requestData] = await db.query("SELECT item_id FROM borrow_requests WHERE id = ?", [requestId]);
    if (requestData.length > 0) {
      await db.query("UPDATE items SET is_available = TRUE WHERE id = ?", [requestData[0].item_id]);
    }

    res.json({ message: "Item returned successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process return" });
  }
});

// GET CONDITION DETAILS
router.get('/condition/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ic.*, br.borrower_id, br.seller_id
      FROM item_conditions ic
      JOIN borrow_requests br ON ic.borrow_request_id = br.id
      WHERE br.id = ? AND (br.borrower_id = ? OR br.seller_id = ?)
    `, [req.params.id, req.user.id, req.user.id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Condition record not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching condition details" });
  }
});

module.exports = router;