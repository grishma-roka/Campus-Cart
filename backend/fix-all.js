require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixAll() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: false,
  });

  const run = async (label, sql) => {
    try {
      await conn.query(sql);
      console.log(`✅ ${label}`);
    } catch (e) {
      const skip = ['Duplicate', 'already exists', 'Multiple primary', "Can't DROP"];
      if (skip.some(s => e.message.includes(s))) {
        console.log(`⏭️  ${label} (already done)`);
      } else {
        console.log(`❌ ${label}: ${e.message.substring(0, 120)}`);
      }
    }
  };

  console.log('\n=== Campus Cart DB Fix ===\n');

  // ── 1. Disable FK checks ───────────────────────────────────────────────────
  await run('Disable FK checks', 'SET FOREIGN_KEY_CHECKS = 0');

  // ── 2. Fix deliveries table ────────────────────────────────────────────────
  const [delivCols] = await conn.query('DESCRIBE deliveries').catch(() => [[]]);
  const delivColNames = delivCols.map(c => c.Field);
  console.log('deliveries columns:', delivColNames.join(', '));

  if (!delivColNames.includes('order_id') || !delivColNames.includes('status')) {
    await run('Drop deliveries', 'DROP TABLE IF EXISTS deliveries');
    await run('Create deliveries', `
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
        status ENUM('pending','assigned','picked_up','delivered','cancelled') DEFAULT 'pending',
        delivery_fee DECIMAL(10,2) DEFAULT 50.00,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  } else {
    // Add missing columns
    await run('deliveries.delivery_lat', 'ALTER TABLE deliveries ADD COLUMN delivery_lat DECIMAL(10,8) DEFAULT NULL');
    await run('deliveries.delivery_lng', 'ALTER TABLE deliveries ADD COLUMN delivery_lng DECIMAL(11,8) DEFAULT NULL');
    await run('deliveries.delivery_fee', 'ALTER TABLE deliveries ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 50.00');
    await run('deliveries.updated_at', 'ALTER TABLE deliveries ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  }

  // ── 3. Fix orders table ────────────────────────────────────────────────────
  await run("orders.payment_status", "ALTER TABLE orders ADD COLUMN payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending'");
  await run('orders.transaction_id', 'ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(100) DEFAULT NULL');
  await run('orders.paid_amount',    'ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT NULL');
  await run('orders.delivery_lat',   'ALTER TABLE orders ADD COLUMN delivery_lat DECIMAL(10,8) DEFAULT NULL');
  await run('orders.delivery_lng',   'ALTER TABLE orders ADD COLUMN delivery_lng DECIMAL(11,8) DEFAULT NULL');
  await run('orders.payment_method', "ALTER TABLE orders ADD COLUMN payment_method ENUM('cod','esewa') DEFAULT 'cod'");
  await run('orders.phone',          'ALTER TABLE orders ADD COLUMN phone VARCHAR(20) DEFAULT NULL');

  // ── 4. Fix transactions table ──────────────────────────────────────────────
  await run('Drop transactions', 'DROP TABLE IF EXISTS transactions');
  await run('Create transactions', `
    CREATE TABLE transactions (
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
    )
  `);

  // ── 5. Notifications table ─────────────────────────────────────────────────
  await run('Create notifications', `
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

  // ── 6. Users location fields ───────────────────────────────────────────────
  await run('users.latitude',           'ALTER TABLE users ADD COLUMN latitude DECIMAL(10,8) DEFAULT NULL');
  await run('users.longitude',          'ALTER TABLE users ADD COLUMN longitude DECIMAL(11,8) DEFAULT NULL');
  await run('users.rider_availability', "ALTER TABLE users ADD COLUMN rider_availability ENUM('available','busy','offline') DEFAULT 'offline'");
  await run('users.is_buyer',           'ALTER TABLE users ADD COLUMN is_buyer BOOLEAN DEFAULT TRUE');
  await run('users.is_seller',          'ALTER TABLE users ADD COLUMN is_seller BOOLEAN DEFAULT FALSE');
  await run('users.is_rider',           'ALTER TABLE users ADD COLUMN is_rider BOOLEAN DEFAULT FALSE');
  await run('users.is_admin',           'ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE');

  // ── 7. Items sold fields ───────────────────────────────────────────────────
  await run('items.is_sold',   'ALTER TABLE items ADD COLUMN is_sold BOOLEAN DEFAULT FALSE');
  await run('items.sold_at',   'ALTER TABLE items ADD COLUMN sold_at TIMESTAMP NULL');
  await run('items.buyer_id',  'ALTER TABLE items ADD COLUMN buyer_id INT DEFAULT NULL');
  await run('items.is_borrowable', 'ALTER TABLE items ADD COLUMN is_borrowable BOOLEAN DEFAULT FALSE');
  await run('items.borrow_price_per_day', 'ALTER TABLE items ADD COLUMN borrow_price_per_day DECIMAL(10,2) DEFAULT 0');
  await run('items.max_borrow_days', 'ALTER TABLE items ADD COLUMN max_borrow_days INT DEFAULT 7');

  // ── 8. Re-enable FK checks ─────────────────────────────────────────────────
  await run('Re-enable FK checks', 'SET FOREIGN_KEY_CHECKS = 1');

  // ── 9. Verify final state ──────────────────────────────────────────────────
  console.log('\n=== Final Table Check ===');
  for (const table of ['deliveries', 'orders', 'transactions', 'notifications', 'users', 'items']) {
    try {
      const [cols] = await conn.query(`DESCRIBE ${table}`);
      console.log(`${table}: ${cols.map(c => c.Field).join(', ')}`);
    } catch (e) {
      console.log(`${table}: ERROR - ${e.message}`);
    }
  }

  await conn.end();
  console.log('\n✅ All done! Restart your backend now.\n');
}

fixAll().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
