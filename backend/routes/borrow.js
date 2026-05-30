const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const upload = require('../utils/multer');

// ─── BORROW ITEMS ──────────────────────────────────────────────────────────────

// GET all borrowable items (public-ish, just needs auth)
router.get('/items', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT i.id, i.title, i.description, i.images, i.borrow_price_per_day as deposit,
             i.max_borrow_days as duration, i.is_available, i.seller_id,
             u.full_name as owner_name, u.phone as owner_phone,
             i.transaction_type
      FROM items i
      JOIN users u ON i.seller_id = u.id
      WHERE i.transaction_type = 'borrow' AND i.is_borrowable = 1
      ORDER BY i.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch borrow items' });
  }
});

// ADD borrow item (any authenticated user)
router.post('/items', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, duration, deposit, location, is_available } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let imageArray = [];
    if (req.file) {
      imageArray = [ req.file.path ];
    } else if (req.body.image) {
      // Fallback for string URL if still sent
      imageArray = [ req.body.image ];
    }

    const transaction_type = req.body.transaction_type || 'borrow';
    const is_borrowable_val = (transaction_type === 'borrow' ? 1 : 0);

    const [result] = await db.query(`
      INSERT INTO items (seller_id, title, description, price, category, images,
                         is_borrowable, borrow_price_per_day, max_borrow_days, is_available, transaction_type)
      VALUES (?, ?, ?, 0, 'Borrow', ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id,
      title,
      description || '',
      JSON.stringify(imageArray),
      is_borrowable_val,
      parseFloat(deposit) || 0,
      parseInt(duration) || 7,
      (is_available === 'true' || is_available === true ? 1 : 0),
      transaction_type
    ]);

    res.json({ message: 'Borrow item added', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add borrow item' });
  }
});

// DELETE borrow item (owner only)
router.delete('/items/:id', auth, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM items WHERE id = ? AND seller_id = ? AND is_borrowable = TRUE',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ─── BORROW REQUESTS ───────────────────────────────────────────────────────────

// CREATE BORROW REQUEST
router.post('/request', auth, async (req, res) => {
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
router.get('/my-requests', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT br.*, i.title, i.description, i.images, u.full_name as seller_name, u.email as seller_email,
             c.id as conversation_id
      FROM borrow_requests br
      JOIN items i ON br.item_id = i.id
      JOIN users u ON br.seller_id = u.id
      LEFT JOIN conversations c ON c.item_id = br.item_id AND (c.buyer_id = br.borrower_id OR c.seller_id = br.borrower_id)
      WHERE br.borrower_id = ?
      ORDER BY br.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching borrow requests" });
  }
});

// GET BORROW REQUESTS FOR ITEM OWNER (any user who listed borrow items)
router.get('/seller-requests', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT br.*, i.title, i.description, i.images, u.full_name as borrower_name, u.email as borrower_email, u.phone as borrower_phone,
             c.id as conversation_id
      FROM borrow_requests br
      JOIN items i ON br.item_id = i.id
      JOIN users u ON br.borrower_id = u.id
      LEFT JOIN conversations c ON c.item_id = br.item_id AND (c.buyer_id = br.borrower_id OR c.seller_id = br.borrower_id)
      WHERE br.seller_id = ?
      ORDER BY br.created_at DESC
    `, [req.user.id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching borrow requests" });
  }
});

// APPROVE/REJECT BORROW REQUEST (item owner)
router.put('/respond/:id', auth, async (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body; 

  try {
    const dbStatus = status === 'accepted' ? 'approved' : status;

    // 1. Update the Request Status First
    const [result] = await db.query(
      "UPDATE borrow_requests SET status = ?, updated_at = NOW() WHERE id = ? AND seller_id = ?",
      [dbStatus, requestId, req.user.id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: "Borrow request not found" });

    // 2. Fetch Data for Chat/Notifications
    const [reqData] = await db.query("SELECT item_id, borrower_id, seller_id FROM borrow_requests WHERE id = ?", [requestId]);
    
    if (reqData.length > 0) {
      const info = reqData[0];

      if (status === 'accepted' || status === 'approved') {
        // NOTE: Item is NOT marked unavailable at approval — only when borrowing actually starts
        // (so the item can still be seen by others until the physical handover happens)

        // Create or find conversation
        let conversation_id = null;
        const [existing] = await db.query(
          "SELECT id FROM conversations WHERE item_id = ? AND (buyer_id = ? OR seller_id = ?) LIMIT 1",
          [info.item_id, info.borrower_id, info.borrower_id]
        );
        if (existing.length > 0) {
          conversation_id = existing[0].id;
        } else {
          const [conv] = await db.query(
            "INSERT INTO conversations (buyer_id, seller_id, item_id) VALUES (?, ?, ?)",
            [info.borrower_id, info.seller_id, info.item_id]
          );
          conversation_id = conv.insertId;
        }

        // Notification to borrower
        try {
          const [item] = await db.query("SELECT title FROM items WHERE id = ?", [info.item_id]);
          const [owner] = await db.query("SELECT full_name FROM users WHERE id = ?", [info.seller_id]);
          if (item.length > 0 && owner.length > 0) {
            await db.query(
              "INSERT INTO notifications (user_id, title, message, type, order_id) VALUES (?, ?, ?, ?, ?)",
              [
                info.borrower_id,
                'Borrow Request Accepted',
                `Your borrow request for "${item[0].title}" has been accepted by ${owner[0].full_name}. Start a conversation now.`,
                'borrow_accepted',
                conversation_id
              ]
            );
          }
        } catch (e) {
          console.error("Notification skipped:", e.message);
        }

        return res.status(200).json({ success: true, message: 'Request accepted successfully', conversation_id });
      }
    }

    res.status(200).json({ success: true, message: `Request ${status} successfully` });

  } catch (err) {
    console.error("CRITICAL ERROR:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// START BORROWING (mark as active — only NOW mark item unavailable)
router.put('/start/:id', auth, async (req, res) => {
  try {
    const { condition_before, images_before } = req.body;
    const requestId = req.params.id;

    // Update borrow request status
    const [result] = await db.query(`
      UPDATE borrow_requests 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND seller_id = ? AND status IN ('approved', 'accepted')
    `, [requestId, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Approved or Accepted borrow request not found" });
    }

    // Get item_id from this request
    const [reqData] = await db.query("SELECT item_id FROM borrow_requests WHERE id = ?", [requestId]);
    if (reqData.length > 0) {
      // Mark item unavailable NOW (physical handover just happened)
      await db.query("UPDATE items SET is_available = FALSE WHERE id = ?", [reqData[0].item_id]);
    }

    // Record initial condition (optional — can be empty)
    await db.query(`
      INSERT INTO item_conditions (borrow_request_id, condition_before, images_before)
      VALUES (?, ?, ?)
    `, [requestId, condition_before || 'Not recorded', JSON.stringify(images_before || [])]);

    res.json({ message: "Borrowing started successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start borrowing" });
  }
});

// MARK BORROWING COMPLETE (lender confirms item returned)
router.put('/complete/:id', auth, async (req, res) => {
  try {
    const requestId = req.params.id;

    // Only the lender (seller_id) can mark complete
    const [result] = await db.query(`
      UPDATE borrow_requests 
      SET status = 'returned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND seller_id = ? AND status IN ('active', 'approved', 'accepted')
    `, [requestId, req.user.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Active borrow request not found or you are not the lender" });
    }

    // Re-open the item for borrowing
    const [reqData] = await db.query("SELECT item_id, borrower_id, total_cost FROM borrow_requests WHERE id = ?", [requestId]);
    if (reqData.length > 0) {
      await db.query("UPDATE items SET is_available = TRUE WHERE id = ?", [reqData[0].item_id]);

      // Notify the borrower
      const [itemData] = await db.query("SELECT title FROM items WHERE id = ?", [reqData[0].item_id]);
      if (itemData.length > 0) {
        await db.query(
          "INSERT INTO notifications (user_id, title, message, type, order_id) VALUES (?, ?, ?, ?, ?)",
          [
            reqData[0].borrower_id,
            '✅ Borrow Complete!',
            `Your borrow of "${itemData[0].title}" has been marked as returned. Total: रू ${reqData[0].total_cost}. Thank you!`,
            'borrow_returned',
            requestId
          ]
        ).catch(() => {}); // non-fatal
      }
    }

    res.json({ message: "Borrowing marked complete. Income recorded and item is available again." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete borrow" });
  }
});

// RETURN ITEM
router.put('/return/:id', auth, async (req, res) => {
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