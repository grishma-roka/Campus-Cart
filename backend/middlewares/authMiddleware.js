const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
  const header = req.headers['authorization'];

  if (!header) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch latest role flags from DB to ensure real-time sync for additive logic
    const db = require('../config/db');
    const [rows] = await db.query(
      "SELECT id, role, is_buyer, is_seller, is_rider, is_active FROM users WHERE id = ?",
      [decoded.id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({ error: "User unauthorized or deactivated" });
    }

    req.user = rows[0]; // attach full user info including additive flags
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token or database error" });
  }
};
