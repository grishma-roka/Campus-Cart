const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');

// SEND MESSAGE
router.post('/send', auth, async (req, res) => {
  try {
    const { receiver_id, message, item_id, borrow_request_id } = req.body;
    const sender_id = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    const [result] = await db.query(`
      INSERT INTO chat_messages (sender_id, receiver_id, message, item_id, borrow_request_id)
      VALUES (?, ?, ?, ?, ?)
    `, [sender_id, receiver_id, message.trim(), item_id, borrow_request_id]);

    res.json({ message: "Message sent successfully", messageId: result.insertId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// GET CONVERSATIONS
router.get('/conversations', auth, async (req, res) => {
  try {
    const [conversations] = await db.query(`
      SELECT 
        CASE 
          WHEN cm.sender_id = ? THEN cm.receiver_id 
          ELSE cm.sender_id 
        END as other_user_id,
        u.full_name as other_user_name,
        u.profile_image as other_user_image,
        cm.message as last_message,
        cm.created_at as last_message_time,
        cm.is_read,
        COUNT(CASE WHEN cm.receiver_id = ? AND cm.is_read = FALSE THEN 1 END) as unread_count
      FROM chat_messages cm
      JOIN users u ON (
        CASE 
          WHEN cm.sender_id = ? THEN cm.receiver_id = u.id
          ELSE cm.sender_id = u.id
        END
      )
      WHERE cm.sender_id = ? OR cm.receiver_id = ?
      GROUP BY other_user_id
      HAVING cm.created_at = (
        SELECT MAX(created_at) 
        FROM chat_messages 
        WHERE (sender_id = ? AND receiver_id = other_user_id) 
           OR (sender_id = other_user_id AND receiver_id = ?)
      )
      ORDER BY last_message_time DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching conversations" });
  }
});

// GET MESSAGES WITH SPECIFIC USER
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const [messages] = await db.query(`
      SELECT cm.*, 
             us.full_name as sender_name, us.profile_image as sender_image,
             ur.full_name as receiver_name, ur.profile_image as receiver_image,
             i.title as item_title
      FROM chat_messages cm
      JOIN users us ON cm.sender_id = us.id
      JOIN users ur ON cm.receiver_id = ur.id
      LEFT JOIN items i ON cm.item_id = i.id
      WHERE (cm.sender_id = ? AND cm.receiver_id = ?) 
         OR (cm.sender_id = ? AND cm.receiver_id = ?)
      ORDER BY cm.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, otherUserId, otherUserId, req.user.id, parseInt(limit), offset]);

    // Mark messages as read
    await db.query(`
      UPDATE chat_messages 
      SET is_read = TRUE 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE
    `, [otherUserId, req.user.id]);

    res.json(messages.reverse()); // Reverse to show oldest first
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

// GET UNREAD MESSAGE COUNT
router.get('/unread-count', auth, async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT COUNT(*) as unread_count
      FROM chat_messages
      WHERE receiver_id = ? AND is_read = FALSE
    `, [req.user.id]);

    res.json({ unread_count: result[0].unread_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching unread count" });
  }
});

// MARK MESSAGES AS READ
router.put('/mark-read/:userId', auth, async (req, res) => {
  try {
    await db.query(`
      UPDATE chat_messages 
      SET is_read = TRUE 
      WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE
    `, [req.params.userId, req.user.id]);

    res.json({ message: "Messages marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

module.exports = router;