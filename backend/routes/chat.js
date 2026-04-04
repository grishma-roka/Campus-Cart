const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// SEND MESSAGE
router.post('/send', auth, upload.single('image'), async (req, res) => {
  try {
    const { conversation_id, message, message_type } = req.body;
    const sender_id = req.user.id;
    let image_url = null;

    if (req.file) {
      image_url = '/uploads/' + req.file.filename;
    }

    if ((!message || !message.trim()) && !image_url) {
      return res.status(400).json({ error: "Message or image cannot be empty" });
    }

    // Verify conversation exists and user is part of it
    const [convCheck] = await db.query(
      "SELECT id FROM conversations WHERE id = ? AND (buyer_id = ? OR seller_id = ?)",
      [conversation_id, sender_id, sender_id]
    );

    if (convCheck.length === 0) {
      return res.status(403).json({ error: "Not authorized for this conversation or conversation not found" });
    }

    const type = message_type && message_type === 'image' ? 'image' : (image_url ? 'image' : 'text');

    const [result] = await db.query(`
      INSERT INTO messages (conversation_id, sender_id, message, image_url, message_type)
      VALUES (?, ?, ?, ?, ?)
    `, [conversation_id, sender_id, message ? message.trim() : null, image_url, type]);

    // Fetch the newly created message to broadcast via socket
    const [newMsgs] = await db.query(`
      SELECT m.*, us.full_name as sender_name, us.profile_image as sender_image
      FROM messages m
      JOIN users us ON m.sender_id = us.id
      WHERE m.id = ?
    `, [result.insertId]);

    if (newMsgs.length > 0) {
      req.app.get('io').to(`conversation_${conversation_id}`).emit('receive_message', newMsgs[0]);
    }

    res.json({ 
      message: "Message sent successfully", 
      messageId: result.insertId,
      image_url
    });

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
        c.id, c.buyer_id, c.seller_id, c.item_id, c.created_at,
        i.title as item_title,
        CASE 
          WHEN c.buyer_id = ? THEN c.seller_id 
          ELSE c.buyer_id 
        END as other_user_id,
        u.full_name as other_user_name,
        u.profile_image as other_user_image,
        (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT message_type FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_type
      FROM conversations c
      JOIN items i ON c.item_id = i.id
      JOIN users u ON (
        CASE 
          WHEN c.buyer_id = ? THEN c.seller_id = u.id
          ELSE c.buyer_id = u.id
        END
      )
      WHERE c.buyer_id = ? OR c.seller_id = ?
      ORDER BY COALESCE(last_message_time, c.created_at) DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id]);

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching conversations" });
  }
});

// GET MESSAGES
router.get('/messages/:conversationId', auth, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user is in conversation
    const [convCheck] = await db.query(
      "SELECT id FROM conversations WHERE id = ? AND (buyer_id = ? OR seller_id = ?)",
      [conversationId, req.user.id, req.user.id]
    );

    if (convCheck.length === 0) {
      return res.status(403).json({ error: "Not authorized for this conversation" });
    }

    const [messages] = await db.query(`
      SELECT m.*, 
             us.full_name as sender_name, us.profile_image as sender_image
      FROM messages m
      JOIN users us ON m.sender_id = us.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `, [conversationId, parseInt(limit), offset]);

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

// GET UNREAD MESSAGE COUNT (Optional/Not fully supported with new simple schema without is_read, mock for now)
router.get('/unread-count', auth, async (req, res) => {
  try {
    // For now returning 0 since we didn't include is_read in the new messages table
    res.json({ unread_count: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching unread count" });
  }
});

module.exports = router;