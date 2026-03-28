require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  const stmts = [
    "ALTER TABLE orders ADD COLUMN payment_status ENUM('pending','paid','failed','refunded') DEFAULT 'pending'",
    "ALTER TABLE orders ADD COLUMN transaction_id VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT NULL",
    `CREATE TABLE IF NOT EXISTS transactions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      order_id INT NOT NULL,
      buyer_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'esewa',
      transaction_id VARCHAR(100) NOT NULL,
      status ENUM('success','failed','pending') DEFAULT 'pending',
      raw_response JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  ];

  for (const s of stmts) {
    try {
      await conn.query(s);
      console.log('OK:', s.substring(0, 60));
    } catch (e) {
      console.log('SKIP:', e.message.substring(0, 80));
    }
  }

  await conn.end();
  console.log('Migration done');
}

run().catch(console.error);
