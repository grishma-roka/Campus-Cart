require('dotenv').config();
const db = require('./config/db');

async function run() {
  // Find all confirmed orders that have no delivery record
  const [orders] = await db.query(`
    SELECT o.id, o.delivery_address, o.delivery_lat, o.delivery_lng,
           40 as delivery_fee,
           u.full_name as seller_name
    FROM orders o
    JOIN users u ON o.seller_id = u.id
    LEFT JOIN deliveries d ON d.order_id = o.id
    WHERE d.id IS NULL AND o.status NOT IN ('cancelled', 'delivered')
  `);

  console.log(`Found ${orders.length} orders missing delivery records`);

  for (const order of orders) {
    const pickup = order.pickup_location || `${order.seller_name} (Campus)`;
    const fee = parseFloat(order.delivery_fee) || 40;

    await db.query(`
      INSERT INTO deliveries (order_id, pickup_address, delivery_address, delivery_lat, delivery_lng, delivery_fee, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [order.id, pickup, order.delivery_address, order.delivery_lat || null, order.delivery_lng || null, fee]);

    console.log(`✅ Created delivery for order #${order.id} — pickup: ${pickup} → ${order.delivery_address}`);
  }

  console.log('Done.');
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
