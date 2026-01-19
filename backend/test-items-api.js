require('dotenv').config();
const db = require('./config/db');

async function testItemsAPI() {
  try {
    console.log('🔍 Testing items API query...');
    
    const query = `
      SELECT i.*, u.full_name as seller_name, u.email as seller_email,
             COALESCE(AVG(r.rating), 0) as seller_rating
      FROM items i 
      JOIN users u ON i.seller_id = u.id 
      LEFT JOIN ratings r ON r.rated_user_id = u.id
      WHERE i.is_available = TRUE
      GROUP BY i.id ORDER BY i.created_at DESC
    `;
    
    const [rows] = await db.query(query);
    
    console.log(`✅ Found ${rows.length} items`);
    
    if (rows.length > 0) {
      console.log('\n📦 Sample items:');
      rows.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.title} - रू${item.price} (${item.category})`);
        console.log(`   Seller: ${item.seller_name}`);
        console.log(`   Available: ${item.is_available ? 'Yes' : 'No'}`);
        console.log(`   Borrowable: ${item.is_borrowable ? 'Yes' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('❌ No items found');
    }
    
  } catch (error) {
    console.error('❌ Error testing items API:', error);
  } finally {
    process.exit(0);
  }
}

testItemsAPI();