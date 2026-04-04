const db = require('../config/db');

module.exports = function requireRole(roles) {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // Primary role check (fast path)
      if (roles.includes(user.role)) return next();

      // Fetch additive role flags from DB
      const [rows] = await db.query(
        'SELECT is_buyer, is_seller, is_rider, is_admin FROM users WHERE id = ?',
        [user.id]
      );
      if (!rows.length) return res.status(403).json({ error: 'User not found' });

      const u = rows[0];
      const roleMap = { buyer: u.is_buyer, seller: u.is_seller, rider: u.is_rider, admin: u.is_admin };
      const hasRole = roles.some(r => roleMap[r]);

      if (hasRole) return next();
      return res.status(403).json({ error: 'Access denied. Insufficient role.' });
    } catch (err) {
      console.error('roleMiddleware error:', err);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};
