const express = require('express');
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * Create delivery (seller/admin)
 */
router.post(
  '/create',
  auth,
  role('seller'),
  async (req, res) => {
    const { order_id } = req.body;

    await db.query(
      "INSERT INTO deliveries (order_id) VALUES (?)",
      [order_id]
    );

    res.json({ message: "Delivery opportunity created" });
  }
);

/**
 * Rider views available deliveries
 */
router.get(
  '/available',
  auth,
  role('rider'),
  async (req, res) => {
    const [rows] = await db.query(
      "SELECT * FROM deliveries WHERE status = 'open'"
    );
    res.json(rows);
  }
);

/**
 * Rider accepts delivery (FIRST COME WINS)
 */
router.put(
  '/accept/:id',
  auth,
  role('rider'),
  async (req, res) => {
    const deliveryId = req.params.id;

    const [result] = await db.query(
      "UPDATE deliveries SET rider_id = ?, status = 'assigned' WHERE id = ? AND status = 'open'",
      [req.user.id, deliveryId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ error: "Delivery already assigned" });
    }

    res.json({ message: "Delivery assigned to you" });
  }
);

module.exports = router;
