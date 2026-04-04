require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({ 
    host: process.env.DB_HOST || 'localhost', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASS || '', 
    database: process.env.DB_NAME || 'campus_cart',
    waitForConnections: true,
    connectionLimit: 1
  });
  
  try {
    console.log('Aligning transaction_type column definition to ENUM...');
    
    // 1. Check if column exists
    const [columns] = await pool.query('SHOW COLUMNS FROM items LIKE "transaction_type"');
    
    if (columns.length === 0) {
      console.log('Adding transaction_type as ENUM...');
      await pool.query("ALTER TABLE items ADD COLUMN transaction_type ENUM('buy', 'borrow') DEFAULT 'buy'");
    } else {
      console.log('Modifying transaction_type to ENUM...');
      await pool.query("ALTER TABLE items MODIFY COLUMN transaction_type ENUM('buy', 'borrow') DEFAULT 'buy'");
    }

    console.log('Synchronizing transaction_type with is_borrowable...');
    await pool.query('UPDATE items SET transaction_type = "borrow" WHERE is_borrowable = 1');
    await pool.query('UPDATE items SET transaction_type = "buy" WHERE is_borrowable = 0 OR is_borrowable IS NULL');
    
    console.log('✅ Schema alignment successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
