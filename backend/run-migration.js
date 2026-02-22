const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('🔄 Running migration...');
    
    // Check and add is_sold field
    try {
      await connection.query(`
        ALTER TABLE items 
        ADD COLUMN is_sold BOOLEAN DEFAULT FALSE AFTER is_available
      `);
      console.log('✅ Added is_sold column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  is_sold column already exists');
      } else {
        throw err;
      }
    }

    // Check and add sold_at timestamp
    try {
      await connection.query(`
        ALTER TABLE items 
        ADD COLUMN sold_at TIMESTAMP NULL AFTER is_sold
      `);
      console.log('✅ Added sold_at column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  sold_at column already exists');
      } else {
        throw err;
      }
    }

    // Check and add buyer_id
    try {
      await connection.query(`
        ALTER TABLE items 
        ADD COLUMN buyer_id INT NULL AFTER sold_at
      `);
      console.log('✅ Added buyer_id column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  buyer_id column already exists');
      } else {
        throw err;
      }
    }

    // Add foreign key if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE items 
        ADD CONSTRAINT fk_buyer 
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Added foreign key constraint');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Foreign key already exists');
      } else {
        throw err;
      }
    }

    // Update existing items
    await connection.query(`
      UPDATE items SET is_sold = FALSE WHERE is_sold IS NULL
    `);
    console.log('✅ Updated existing items');

    // Modify orders quantity
    await connection.query(`
      ALTER TABLE orders 
      MODIFY COLUMN quantity INT DEFAULT 1
    `);
    console.log('✅ Modified orders quantity column');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
