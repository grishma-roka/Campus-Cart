require('dotenv').config();
const mysql = require('mysql2/promise');

async function sync() {
  const db = await mysql.createConnection({ 
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASS || 'grish567', 
    database: process.env.DB_NAME || 'campus_cart' 
  });
  
  try {
    console.log('🔄 Starting DB Synchronization...');
    
    // Hard Sync: Anything that was borrowable to the new borrow type
    const [res1] = await db.query("UPDATE items SET transaction_type = 'borrow', is_borrowable = 1 WHERE is_borrowable = 1 OR transaction_type = 'borrow'");
    console.log(`- Borrow items sync: ${res1.affectedRows} rows`);

    // Hard Sync: Remaining to buy
    const [res2] = await db.query("UPDATE items SET transaction_type = 'buy', is_borrowable = 0 WHERE transaction_type != 'borrow' OR transaction_type IS NULL");
    console.log(`- Buy items sync: ${res2.affectedRows} rows`);

    console.log('✅ DB Synchronized Successfully');
  } catch (err) {
    console.error('❌ Sync failed:', err);
  } finally {
    await db.end();
  }
}

sync();
