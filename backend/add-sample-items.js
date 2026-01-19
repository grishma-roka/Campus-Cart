require('dotenv').config();
const db = require('./config/db');

async function addSampleItems() {
  try {
    console.log('🔄 Adding sample items...');
    
    // First, let's check if we have any sellers
    const [sellers] = await db.query("SELECT id, full_name FROM users WHERE role IN ('seller', 'admin')");
    
    if (sellers.length === 0) {
      console.log('❌ No sellers found. Creating a sample seller...');
      
      // Create a sample seller
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password', 10);
      
      const [result] = await db.query(
        "INSERT INTO users (full_name, email, password, student_id, role) VALUES (?, ?, ?, ?, ?)",
        ['Sample Seller', 'seller@campus.edu', hashedPassword, 'SELL001', 'seller']
      );
      
      sellers.push({ id: result.insertId, full_name: 'Sample Seller' });
      console.log('✅ Sample seller created');
    }
    
    const sellerId = sellers[0].id;
    console.log(`📦 Using seller: ${sellers[0].full_name} (ID: ${sellerId})`);
    
    // Sample items data
    const sampleItems = [
      {
        title: 'Scientific Calculator',
        description: 'Casio FX-991ES Plus scientific calculator, perfect for engineering and math courses. Excellent condition.',
        price: 2500,
        category: 'Electronics',
        condition_status: 'like_new',
        is_borrowable: true,
        borrow_price_per_day: 50,
        max_borrow_days: 14
      },
      {
        title: 'Engineering Textbook - Thermodynamics',
        description: 'Fundamentals of Engineering Thermodynamics by Moran & Shapiro. 8th Edition. Great for mechanical engineering students.',
        price: 1800,
        category: 'Books',
        condition_status: 'good',
        is_borrowable: true,
        borrow_price_per_day: 30,
        max_borrow_days: 30
      },
      {
        title: 'Laptop Stand - Adjustable',
        description: 'Ergonomic aluminum laptop stand, adjustable height and angle. Perfect for online classes and study sessions.',
        price: 3200,
        category: 'Accessories',
        condition_status: 'new',
        is_borrowable: false,
        borrow_price_per_day: 0,
        max_borrow_days: 0
      },
      {
        title: 'Programming Books Set',
        description: 'Collection of 3 programming books: Python Crash Course, JavaScript Guide, and Data Structures & Algorithms.',
        price: 2800,
        category: 'Books',
        condition_status: 'good',
        is_borrowable: true,
        borrow_price_per_day: 40,
        max_borrow_days: 21
      },
      {
        title: 'Wireless Mouse - Logitech',
        description: 'Logitech M705 wireless mouse with long battery life. Perfect for presentations and daily use.',
        price: 1500,
        category: 'Electronics',
        condition_status: 'like_new',
        is_borrowable: false,
        borrow_price_per_day: 0,
        max_borrow_days: 0
      },
      {
        title: 'Mechanical Keyboard',
        description: 'Blue switch mechanical keyboard, great for programming and typing. RGB backlight included.',
        price: 3500,
        category: 'Electronics',
        condition_status: 'good',
        is_borrowable: true,
        borrow_price_per_day: 60,
        max_borrow_days: 10
      },
      {
        title: 'Study Lamp - LED',
        description: 'Adjustable LED study lamp with multiple brightness levels and USB charging port.',
        price: 1200,
        category: 'Accessories',
        condition_status: 'new',
        is_borrowable: false,
        borrow_price_per_day: 0,
        max_borrow_days: 0
      },
      {
        title: 'Backpack - Laptop Compatible',
        description: 'Durable laptop backpack with multiple compartments, water-resistant material. Perfect for daily campus use.',
        price: 2200,
        category: 'Accessories',
        condition_status: 'like_new',
        is_borrowable: false,
        borrow_price_per_day: 0,
        max_borrow_days: 0
      }
    ];
    
    // Check if items already exist
    const [existingItems] = await db.query("SELECT COUNT(*) as count FROM items");
    
    if (existingItems[0].count > 0) {
      console.log(`📦 Found ${existingItems[0].count} existing items in database`);
      return;
    }
    
    // Insert sample items
    for (const item of sampleItems) {
      await db.query(
        `INSERT INTO items (seller_id, title, description, price, category, condition_status, is_borrowable, borrow_price_per_day, max_borrow_days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sellerId, item.title, item.description, item.price, item.category, item.condition_status, item.is_borrowable, item.borrow_price_per_day, item.max_borrow_days]
      );
    }
    
    console.log(`✅ Added ${sampleItems.length} sample items successfully!`);
    
    // Show final count
    const [finalCount] = await db.query("SELECT COUNT(*) as count FROM items WHERE is_available = TRUE");
    console.log(`📊 Total available items: ${finalCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Error adding sample items:', error);
  } finally {
    process.exit(0);
  }
}

addSampleItems();