require('dotenv').config();
const db = require('./config/db');

async function makeAdmin() {
  const email = 'np03cs4a230143@heraldcollege.edu.np';
  try {
    const [result] = await db.query(`
      UPDATE users 
      SET role = 'admin', is_admin = TRUE, is_buyer = TRUE, is_seller = TRUE, is_rider = TRUE
      WHERE email = ?
    `, [email]);
    console.log('Update successful:', result);
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

makeAdmin();
