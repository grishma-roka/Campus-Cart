require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME,
  });

  // Show current structure
  try {
    const [cols] = await conn.query('DESCRIBE transactions');
    console.log('Current transactions columns:', cols.map(c => c.Field).join(', '));
  } catch (e) {
    console.log('transactions table does not exist, creating...');
  }

  // Drop and recreate with correct schema
  const stmts = [
    'DROP TABLE IF EXISTS transactions',
    `CREATE TABLE transactions (
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
      console.log('ERR:', e.message);
    }
  }

  await conn.end();
  console.log('Done');
}

run().catch(console.error);
