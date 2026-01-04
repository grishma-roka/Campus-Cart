const express = require("express");
const db = require("../config/db");
const auth = require("../middlewares/authMiddleware");
const requireRole = require("../middlewares/roleMiddleware");
const sendMail = require("../utils/sendEmail");

const router = express.Router();

// REQUEST RIDER ROLE
router.post("/request", auth, async (req, res) => {
  try {
    const { license_number, license_image } = req.body;

    // Check if user already has a pending request
    const [existing] = await db.query(
      "SELECT id FROM rider_requests WHERE user_id = ? AND status = 'pending'",
      [req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "You already have a pending rider request" });
    }

    // Create rider request
    await db.query(
      "INSERT INTO rider_requests (user_id, license_number, license_image) VALUES (?, ?, ?)",
      [req.user.id, license_number, license_image]
    );

    // Send email notification to admin
    const [userRows] = await db.query("SELECT full_name, email FROM users WHERE id = ?", [req.user.id]);
    const user = userRows[0];
    
    await sendMail(
      `New Rider Application`,
      `User ${user.full_name} (${user.email}) has applied to become a rider. License: ${license_number}. Please review in admin panel.`
    );

    res.json({ message: "Rider request submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit rider request" });
  }
});

// GET USER'S RIDER REQUEST STATUS
router.get("/status", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM rider_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );

    if (!rows.length) {
      return res.json({ status: "none" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching rider status" });
  }
});

// GET RIDER STATS (for approved riders)
router.get("/stats", auth, requireRole(['rider']), async (req, res) => {
  try {
    const [deliveryStats] = await db.query(`
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
        COUNT(CASE WHEN status IN ('assigned', 'picked_up') THEN 1 END) as active_deliveries,
        SUM(delivery_fee) as total_earnings
      FROM deliveries 
      WHERE rider_id = ?
    `, [req.user.id]);

    const [ratingStats] = await db.query(`
      SELECT AVG(rating) as average_rating, COUNT(*) as total_ratings
      FROM ratings 
      WHERE rated_user_id = ? AND type LIKE '%_to_rider'
    `, [req.user.id]);

    res.json({
      deliveries: deliveryStats[0],
      ratings: ratingStats[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching rider stats" });
  }
});

module.exports = router;
