require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Testing route
app.get('/', (req, res) => {
  res.send("Campus Cart API is running ✔️");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
