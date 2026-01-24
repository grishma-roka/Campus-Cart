const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const sendMail = require('../utils/sendEmail');

const router = express.Router();

// GET ALL RIDER REQUESTS
router.get('/rider-requests', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    console.log('📋 Admin fetching rider requests...');
    const [rows] = await db.query(`
      SELECT rr.*, u.full_name, u.email, u.student_id, u.phone
      FROM rider_requests rr
      JOIN users u ON rr.user_id = u.id
      ORDER BY rr.created_at DESC
    `);

    console.log(`✅ Found ${rows.length} rider requests`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching rider requests:', err);
    res.status(500).json({ error: "Error fetching rider requests" });
  }
});

// APPROVE/REJECT RIDER REQUEST
router.put('/rider-requests/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { status, admin_notes } = req.body; // status: 'approved' or 'rejected'
    const requestId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    console.log(`🔄 Admin ${req.user.id} ${status} rider request ${requestId}`);

    // Get request details
    const [requestRows] = await db.query(`
      SELECT rr.*, u.full_name, u.email 
      FROM rider_requests rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.id = ?
    `, [requestId]);

    if (!requestRows.length) {
      return res.status(404).json({ error: "Rider request not found" });
    }

    const request = requestRows[0];

    // Update request status - use only columns that exist
    try {
      await db.query(`
        UPDATE rider_requests 
        SET status = ?
        WHERE id = ?
      `, [status, requestId]);
      
      console.log(`✅ Updated rider request ${requestId} to ${status}`);
      
    } catch (updateErr) {
      console.error('❌ Error updating rider request:', updateErr);
      return res.status(500).json({ error: "Failed to update rider request" });
    }

    if (status === 'approved') {
      // Update user role to rider and activate account
      try {
        await db.query(
          "UPDATE users SET role = 'rider', is_active = TRUE WHERE id = ?",
          [request.user_id]
        );

        console.log(`✅ User ${request.user_id} (${request.full_name}) approved as rider`);

        // Send approval email to rider
        try {
          await sendMail(
            'Rider Application Approved - Campus Cart',
            `🎉 CONGRATULATIONS ${request.full_name}!

✅ Your rider application has been APPROVED!

🚚 You are now an official Campus Cart rider!

🔑 What you can do now:
• Login to your account at: http://localhost:3000/login
• Switch to "Rider Mode" using the role switcher
• Accept delivery requests from buyers and sellers
• Earn money by completing deliveries
• Build your rider rating and reputation

📧 Your login credentials:
Email: ${request.email}
(Use your existing password)

🎯 Getting Started:
1. Login to your account
2. Click on "Rider Mode" in the dashboard
3. View available delivery requests
4. Accept deliveries and start earning!

📞 Need help? Contact support or check the rider guidelines in your dashboard.

Welcome to the Campus Cart rider community! 🚚💨

Best regards,
Campus Cart Team`
          );
          console.log('📧 Rider approval email sent successfully');
        } catch (emailErr) {
          console.log('⚠️ Rider email sending failed:', emailErr.message);
        }
      } catch (userUpdateErr) {
        console.error('❌ Error updating user role:', userUpdateErr);
        return res.status(500).json({ error: "Failed to update user role" });
      }
    } else {
      // For rejected applications, send rejection email to rider
      try {
        await sendMail(
          'Rider Application Update - Campus Cart',
          `Hello ${request.full_name},

❌ Your rider application has been reviewed and unfortunately was not approved at this time.

📋 Application Details:
License Number: ${request.license_number}
Status: Rejected

${admin_notes ? `📝 Reason: ${admin_notes}` : '📞 Please contact support for more information.'}

🔄 What you can do:
• Review the rejection reason above
• Ensure your license image is clear and valid
• You can reapply with updated information if needed
• Contact support if you have questions

📧 Questions? Reply to this email or contact support.

Thank you for your interest in Campus Cart.

Best regards,
Campus Cart Team`
        );
        console.log('📧 Rider rejection email sent successfully');
      } catch (emailErr) {
        console.log('⚠️ Rider email sending failed:', emailErr.message);
      }
    }

    res.json({ 
      message: `Rider request ${status} successfully`,
      userActivated: status === 'approved',
      requestId: requestId,
      userName: request.full_name
    });
  } catch (err) {
    console.error('❌ Error processing rider request:', err);
    res.status(500).json({ error: "Failed to process rider request: " + err.message });
  }
});

// GET ALL USERS
router.get('/users', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    console.log('👥 Fetching users...');
    const { role, search } = req.query;
    let query = `
      SELECT u.id, u.full_name, u.email, u.student_id, u.phone, u.role, u.is_active, u.created_at,
             COUNT(DISTINCT i.id) as items_listed,
             COUNT(DISTINCT o.id) as orders_made,
             COALESCE(AVG(r.rating), 0) as average_rating
      FROM users u
      LEFT JOIN items i ON u.id = i.seller_id
      LEFT JOIN orders o ON u.id = o.buyer_id
      LEFT JOIN ratings r ON u.id = r.rated_user_id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += ' AND u.role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY u.id ORDER BY u.created_at DESC';

    const [rows] = await db.query(query, params);
    
    // Add deliveries count separately to avoid join issues
    for (let user of rows) {
      try {
        const [deliveryCount] = await db.query(
          "SELECT COUNT(*) as deliveries_completed FROM deliveries WHERE rider_id = ? AND status = 'delivered'",
          [user.id]
        );
        user.deliveries_completed = deliveryCount[0].deliveries_completed;
      } catch (err) {
        user.deliveries_completed = 0;
      }
    }
    
    console.log(`✅ Found ${rows.length} users`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ error: "Error fetching users" });
  }
});

// TOGGLE USER STATUS
router.put('/users/:id/toggle-status', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;

    const [result] = await db.query(
      "UPDATE users SET is_active = NOT is_active WHERE id = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User status updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// GET SYSTEM STATS
router.get('/stats', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    console.log('📊 Fetching admin stats...');
    
    const [userStats] = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'buyer' THEN 1 END) as buyers,
        COUNT(CASE WHEN role = 'seller' THEN 1 END) as sellers,
        COUNT(CASE WHEN role = 'rider' THEN 1 END) as riders,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users
      FROM users
    `);

    const [itemStats] = await db.query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_available = TRUE THEN 1 END) as available_items,
        COUNT(CASE WHEN is_borrowable = TRUE THEN 1 END) as borrowable_items,
        AVG(price) as average_price
      FROM items
    `);

    const [orderStats] = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status IN ('pending', 'confirmed', 'assigned', 'picked_up') THEN 1 END) as active_orders,
        SUM(total_amount) as total_revenue
      FROM orders
    `);

    const [borrowStats] = await db.query(`
      SELECT 
        COUNT(*) as total_borrows,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as completed_borrows,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_borrows,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_borrows
      FROM borrow_requests
    `);

    // Check if deliveries table exists and has status column
    let deliveryStats = [{ total_deliveries: 0, completed_deliveries: 0, active_deliveries: 0, pending_deliveries: 0 }];
    try {
      const [result] = await db.query(`
        SELECT 
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
          COUNT(CASE WHEN status IN ('assigned', 'picked_up') THEN 1 END) as active_deliveries,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_deliveries
        FROM deliveries
      `);
      deliveryStats = result;
    } catch (deliveryErr) {
      console.log('⚠️ Deliveries table issue:', deliveryErr.message);
    }

    console.log('✅ Stats fetched successfully');
    res.json({
      users: userStats[0],
      items: itemStats[0],
      orders: orderStats[0],
      borrows: borrowStats[0],
      deliveries: deliveryStats[0]
    });
  } catch (err) {
    console.error('❌ Error fetching system stats:', err);
    res.status(500).json({ error: "Error fetching system stats" });
  }
});

// GET RECENT ACTIVITIES
router.get('/activities', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const [activities] = await db.query(`
      (SELECT 'user_registered' as type, u.full_name as user_name, u.created_at as timestamp, 
              CONCAT('New user registered: ', u.full_name) as description
       FROM users u ORDER BY u.created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'item_listed' as type, u.full_name as user_name, i.created_at as timestamp,
              CONCAT('Item listed: ', i.title) as description
       FROM items i JOIN users u ON i.seller_id = u.id ORDER BY i.created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'order_placed' as type, u.full_name as user_name, o.created_at as timestamp,
              CONCAT('Order placed for: ', i.title) as description
       FROM orders o JOIN users u ON o.buyer_id = u.id JOIN items i ON o.item_id = i.id 
       ORDER BY o.created_at DESC LIMIT 5)
      ORDER BY timestamp DESC LIMIT 20
    `);

    res.json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching activities" });
  }
});

module.exports = router;
