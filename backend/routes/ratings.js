const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');

// CREATE RATING
router.post('/create', auth, async (req, res) => {
  try {
    const { rated_user_id, order_id, borrow_request_id, rating, review, type } = req.body;
    const rater_id = req.user.id;

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Check if user has already rated this transaction
    let checkQuery = "SELECT id FROM ratings WHERE rater_id = ? AND rated_user_id = ?";
    let checkParams = [rater_id, rated_user_id];

    if (order_id) {
      checkQuery += " AND order_id = ?";
      checkParams.push(order_id);
    }

    if (borrow_request_id) {
      checkQuery += " AND borrow_request_id = ?";
      checkParams.push(borrow_request_id);
    }

    const [existing] = await db.query(checkQuery, checkParams);

    if (existing.length > 0) {
      return res.status(400).json({ error: "You have already rated this transaction" });
    }

    // Verify user can rate this transaction
    if (order_id) {
      const [orderRows] = await db.query(
        "SELECT * FROM orders WHERE id = ? AND (buyer_id = ? OR seller_id = ?) AND status = 'delivered'",
        [order_id, rater_id, rater_id]
      );

      if (!orderRows.length) {
        return res.status(403).json({ error: "You cannot rate this order" });
      }
    }

    if (borrow_request_id) {
      const [borrowRows] = await db.query(
        "SELECT * FROM borrow_requests WHERE id = ? AND (borrower_id = ? OR seller_id = ?) AND status = 'returned'",
        [borrow_request_id, rater_id, rater_id]
      );

      if (!borrowRows.length) {
        return res.status(403).json({ error: "You cannot rate this borrow transaction" });
      }
    }

    // Create rating
    const [result] = await db.query(`
      INSERT INTO ratings (rater_id, rated_user_id, order_id, borrow_request_id, rating, review, type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [rater_id, rated_user_id, order_id, borrow_request_id, rating, review, type]);

    res.json({ message: "Rating submitted successfully", ratingId: result.insertId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit rating" });
  }
});

// GET USER RATINGS
router.get('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const [ratings] = await db.query(`
      SELECT r.*, u.full_name as rater_name
      FROM ratings r
      JOIN users u ON r.rater_id = u.id
      WHERE r.rated_user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);

    const [stats] = await db.query(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM ratings
      WHERE rated_user_id = ?
    `, [userId]);

    res.json({
      ratings,
      stats: stats[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching ratings" });
  }
});

// GET MY RATINGS (ratings I've given)
router.get('/my-ratings', auth, async (req, res) => {
  try {
    const [ratings] = await db.query(`
      SELECT r.*, u.full_name as rated_user_name, i.title as item_title
      FROM ratings r
      JOIN users u ON r.rated_user_id = u.id
      LEFT JOIN orders o ON r.order_id = o.id
      LEFT JOIN items i ON o.item_id = i.id
      WHERE r.rater_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json(ratings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching your ratings" });
  }
});

// GET RATINGS RECEIVED
router.get('/received', auth, async (req, res) => {
  try {
    const [ratings] = await db.query(`
      SELECT r.*, u.full_name as rater_name, i.title as item_title
      FROM ratings r
      JOIN users u ON r.rater_id = u.id
      LEFT JOIN orders o ON r.order_id = o.id
      LEFT JOIN items i ON o.item_id = i.id
      WHERE r.rated_user_id = ?
      ORDER BY r.created_at DESC
    `, [req.user.id]);

    res.json(ratings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching ratings received" });
  }
});

module.exports = router;