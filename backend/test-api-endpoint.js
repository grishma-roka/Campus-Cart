require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/test-items', async (req, res) => {
  try {
    console.log('🔍 Testing items endpoint...');
    const [rows] = await db.query(`
      SELECT i.*, u.full_name as seller_name, u.email as seller_email,
             COALESCE(AVG(r.rating), 0) as seller_rating
      FROM items i 
      JOIN users u ON i.seller_id = u.id 
      LEFT JOIN ratings r ON r.rated_user_id = u.id
      WHERE i.is_available = TRUE
      GROUP BY i.id ORDER BY i.created_at DESC
    `);
    
    console.log(`✅ Found ${rows.length} items`);
    res.json({
      success: true,
      count: rows.length,
      items: rows
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log(`📡 Test endpoint: http://localhost:${PORT}/test-items`);
});