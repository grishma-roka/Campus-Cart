require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// Test DB
db.query("SELECT 1")
  .then(() => console.log("MySQL Connected ✔️"))
  .catch(err => console.log("MySQL Connection Error ❌", err));

// ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/borrow', require('./routes/borrow'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/rider', require('./routes/rider'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/chat', require('./routes/chat'));

app.get('/', (req, res) => {
  res.send("Campus Cart API is running ✔️");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
