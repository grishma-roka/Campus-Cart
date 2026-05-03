require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkOrders() {
  const db = await mysql.createConnection({ 
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASS || 'grish567', 
    database: process.env.DB_NAME || 'campus_cart' 
  });
  
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM orders");
    console.log('--- Columns in ORDERS table ---');
    rows.forEach(r => console.log(`${r.Field}: ${r.Type}`));
    
    // Check if any orders exist and their lat/lng
    const [orders] = await db.query("SELECT id, status, total_amount, delivery_address, delivery_lat, delivery_lng FROM orders LIMIT 5");
    console.log('\n--- SAMPLE ORDERS ---');
    orders.forEach(o => console.log(JSON.stringify(o)));
    
  } catch (err) {
    console.error('❌ Check failed:', err);
  } finally {
    await db.end();
  }
}

checkOrders();
