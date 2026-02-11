require('dotenv').config();
const db = require('./config/db');

async function checkUser() {
  try {
    console.log('Checking for admin user...');
    const [users] = await db.query(
      "SELECT id, full_name, email, role, is_active FROM users WHERE email = ?",
      ['np03cs4a230143@heraldcollege.edu.np']
    );
    
    if (users.length > 0) {
      console.log('✅ User found:');
      console.log(users[0]);
    } else {
      console.log('❌ User not found!');
      console.log('Listing all users:');
      const [allUsers] = await db.query("SELECT id, full_name, email, role FROM users LIMIT 5");
      console.table(allUsers);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
