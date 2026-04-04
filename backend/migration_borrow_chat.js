require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Starting chat migration...");

    // Create conversations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        buyer_id INT NOT NULL,
        seller_id INT NOT NULL,
        item_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    console.log("✅ Table 'conversations' created or already exists.");

    // Create messages table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        message TEXT,
        image_url VARCHAR(255),
        message_type ENUM('text', 'image') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    console.log("✅ Table 'messages' created or already exists.");

    console.log("Migration completed successfully.");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

migrate();
