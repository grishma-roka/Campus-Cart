require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkColumns() {
  const db = await mysql.createConnection({ 
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASS || 'grish567', 
    database: process.env.DB_NAME || 'campus_cart' 
  });
  
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM users");
    console.log('--- Columns in USERS table ---');
    rows.forEach(r => console.log(`${r.Field}: ${r.Type}`));
    
    // Also check current rider status
    const [riders] = await db.query("SELECT id, full_name, role, rider_availability, is_active FROM users WHERE role = 'rider'");
    console.log('\n--- RIDERS in database ---');
    riders.forEach(r => console.log(JSON.stringify(r)));
    
  } catch (err) {
    console.error('❌ Check failed:', err);
  } finally {
    await db.end();
  }
}

checkColumns();
