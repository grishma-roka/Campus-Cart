const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // Added the port variable we fixed earlier!
  waitForConnections: true,
  connectionLimit: 10,
  ssl: {
    rejectUnauthorized: false, // This tells mysql2 to allow Aiven's secure cloud certificate
  },
});

module.exports = pool.promise();