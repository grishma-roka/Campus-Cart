require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME,
  });

  const email = 'np03cs4a230143@heraldcollege.edu.np';

  const [result] = await conn.query(`
    UPDATE users
    SET role = 'admin', is_admin = 1, is_buyer = 1, is_seller = 1, is_rider = 0
    WHERE email = ?
  `, [email]);

  if (result.affectedRows) {
    console.log(`✅ ${email} is now admin+buyer+seller+rider`);
  } else {
    console.log('❌ User not found:', email);
  }

  const [rows] = await conn.query('SELECT id, email, role, is_admin, is_buyer, is_seller, is_rider FROM users WHERE email = ?', [email]);
  console.log('Current state:', rows[0]);

  await conn.end();
}

run().catch(console.error);
