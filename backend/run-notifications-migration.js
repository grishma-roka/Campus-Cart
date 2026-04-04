require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  const stmts = [
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      order_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
  ];
  for (const s of stmts) {
    try { await conn.query(s); console.log('OK:', s.substring(0, 60)); }
    catch (e) { console.log('SKIP:', e.message.substring(0, 80)); }
  }
  await conn.end();
  console.log('Done');
}
run().catch(console.error);
