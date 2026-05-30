require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ── Per-conversation room (chat) ────────────────────────────────────────────
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // ── Per-order room (legacy delivery tracking) ───────────────────────────────
  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`Socket ${socket.id} joined order ${orderId}`);
  });

  // ── Riders broadcast room ───────────────────────────────────────────────────
  socket.on('join_riders', () => {
    socket.join('riders');
    console.log(`Socket ${socket.id} joined riders room`);
  });

  // ── Per-user private room — buyers & sellers join this for direct targeting ─
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} joined user room user_${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/items', express.static(path.join(__dirname, 'uploads', 'items')));
app.use('/uploads/licenses', express.static(path.join(__dirname, 'uploads', 'licenses')));
// Legacy direct paths
app.use('/items', express.static(path.join(__dirname, 'uploads', 'items')));
app.use('/licenses', express.static(path.join(__dirname, 'uploads', 'licenses')));

// Auto-run DB migrations on startup
async function runMigrations() {
  // Each statement is run independently — errors are caught and logged
  const run = async (sql) => {
    try { await db.query(sql); }
    catch (e) {
      const msg = e.message || '';
      // Silently skip "already exists" and "duplicate column" errors
      if (msg.includes('Duplicate') || msg.includes('already exists') || msg.includes('Multiple primary key')) return;
      console.log('Migration note:', msg.substring(0, 100));
    }
  };

  // ── Recreate deliveries table with correct schema ──────────────────────────
  // Check if deliveries has the right columns; if not, drop and recreate
  try {
    const [cols] = await db.query('DESCRIBE deliveries');
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('order_id') || !colNames.includes('status') || !colNames.includes('pickup_address') || !colNames.includes('accepted_at')) {
      console.log('Recreating deliveries table with correct schema...');
      await db.query('SET FOREIGN_KEY_CHECKS = 0');
      await db.query('DROP TABLE IF EXISTS deliveries');
      await db.query('SET FOREIGN_KEY_CHECKS = 1');
      await db.query(`
        CREATE TABLE deliveries (
          id INT PRIMARY KEY AUTO_INCREMENT,
          order_id INT NOT NULL,
          rider_id INT DEFAULT NULL,
          pickup_address TEXT NOT NULL,
          delivery_address TEXT NOT NULL,
          delivery_lat DECIMAL(10,8) DEFAULT NULL,
          delivery_lng DECIMAL(11,8) DEFAULT NULL,
          pickup_time TIMESTAMP NULL,
          delivery_time TIMESTAMP NULL,
          accepted_at TIMESTAMP NULL DEFAULT NULL,
          picked_up_at TIMESTAMP NULL DEFAULT NULL,
          out_for_delivery_at TIMESTAMP NULL DEFAULT NULL,
          delivered_at TIMESTAMP NULL DEFAULT NULL,
          status ENUM('pending','assigned','picked_up','out_for_delivery','delivered','cancelled') DEFAULT 'pending',
          delivery_fee DECIMAL(10,2) DEFAULT 50.00,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      console.log('✅ deliveries table recreated');
    }
  } catch (e) {
    console.log('deliveries check error:', e.message);
  }

  // Run alterations for existing databases
  await run("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'confirmed', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled') DEFAULT 'pending'");
  await run("ALTER TABLE deliveries MODIFY COLUMN status ENUM('pending', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled') DEFAULT 'pending'");
  await run("ALTER TABLE deliveries ADD COLUMN accepted_at TIMESTAMP NULL DEFAULT NULL");
  await run("ALTER TABLE deliveries ADD COLUMN picked_up_at TIMESTAMP NULL DEFAULT NULL");
  await run("ALTER TABLE deliveries ADD COLUMN out_for_delivery_at TIMESTAMP NULL DEFAULT NULL");
  await run("ALTER TABLE deliveries ADD COLUMN delivered_at TIMESTAMP NULL DEFAULT NULL");

  // ── Fix deliveries.transaction_id if it exists (shouldn't be there) ────────
  try {
    await db.query('ALTER TABLE deliveries DROP COLUMN transaction_id');
    console.log('✅ removed stray transaction_id from deliveries');
  } catch (e) { /* column doesn't exist, fine */ }
  await run("ALTER TABLE orders ADD COLUMN payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending'");
  await run("ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(100) DEFAULT NULL");
  await run("ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT NULL");

  // ── Delivery pipeline additions ────────────────────────────────────────────
  // Seller's pickup point on each item listing
  await run("ALTER TABLE items ADD COLUMN pickup_location VARCHAR(255) DEFAULT NULL");

  // Delivery fee stored per order (computed at checkout time)
  await run("ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0.00");

  // Wallet balance for sellers and riders (credited on delivery completion)
  await run("ALTER TABLE users ADD COLUMN balance DECIMAL(10,2) DEFAULT 0.00");

  console.log('✅ Delivery pipeline schema ready');

  // ── transactions table ─────────────────────────────────────────────────────
  try {
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('DROP TABLE IF EXISTS transactions');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    await db.query(`CREATE TABLE transactions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      buyer_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'esewa',
      transaction_id VARCHAR(100) DEFAULT NULL,
      status ENUM('success','failed','pending') DEFAULT 'pending',
      raw_response JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    console.log('✅ transactions table ready');
  } catch (e) {
    // Table exists — just fix the column
    try {
      await db.query('ALTER TABLE transactions MODIFY COLUMN transaction_id VARCHAR(100) DEFAULT NULL');
      console.log('✅ transactions.transaction_id fixed');
    } catch (e2) { /* already nullable */ }
  }

  // ── notifications table ────────────────────────────────────────────────────
  await run(`CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    order_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // ── conversations table ────────────────────────────────────────────────────
  await run(`CREATE TABLE IF NOT EXISTS conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    item_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // ── messages table ─────────────────────────────────────────────────────────
  await run(`CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT,
    image_url VARCHAR(500),
    message_type ENUM('text','image') DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  console.log('✅ Migrations done');

  // Ensure admin account has all roles
  try {
    await db.query(`
      UPDATE users SET role='admin', is_admin=1, is_buyer=1, is_seller=1, is_rider=1
      WHERE email='np03cs4a230143@heraldcollege.edu.np'
    `);
  } catch(e) { /* silent */ }
}

runMigrations();

// Test DB
db.query("SELECT 1")
  .then(() => console.log("MySQL Connected ✔️"))
  .catch(err => console.log("MySQL Connection Error ❌", err));

// ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/items', require('./routes/items'));
app.use('/api/borrow', require('./routes/borrow'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/rider', require('./routes/rider'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/test/items', async (req, res) => {
  try {
    const [items] = await db.query("SELECT id, title, price, seller_id, is_available FROM items");
    res.json({
      count: items.length,
      items: items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test/rider-requests', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT rr.id, rr.user_id, rr.license_number, rr.status, u.full_name, u.email, u.role
      FROM rider_requests rr
      JOIN users u ON rr.user_id = u.id
      ORDER BY rr.created_at DESC
    `);
    res.json({
      count: requests.length,
      requests: requests
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Campus Cart API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send("Campus Cart API is running ✔️");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
