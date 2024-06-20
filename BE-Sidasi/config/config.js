const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sidasi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Secret key for JWT
const secretKey = '7cda34eb4fe8b9f794152930cd3c0cb8e9eb6ac912894717c12344a2f4de40b50e5a7fd25f30ada44764a8c05e7d6aab8568b85ef50c91d10ad4a3aa351f5f00'; // Ganti dengan secret key yang sesuai

module.exports = {
  pool,
  secretKey
};
