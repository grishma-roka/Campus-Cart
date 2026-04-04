require('dotenv').config();
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');

// Ensure table exists on startup
async function ensureTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        order_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (e) { /* already exists */ }
}
ensureTable();

// Helper to create a notification
async function createNotification(userId, title, message, type = 'info', orderId = null) {
  await db.query(
    'INSERT INTO notifications (user_id, title, message, type, order_id) VALUES (?, ?, ?, ?, ?)',
    [userId, title, message, type, orderId]
  );
}

// GET my notifications
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// MARK all as read
router.put('/mark-read', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

module.exports = router;
module.exports.createNotification = createNotification;
