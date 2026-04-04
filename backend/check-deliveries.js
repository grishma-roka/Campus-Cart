require('dotenv').config();
const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  const [cols] = await conn.query('DESCRIBE deliveries');
  console.log('deliveries columns:', cols.map(c => `${c.Field}(${c.Type})`).join(', '));
  await conn.end();
}
run().catch(console.error);
