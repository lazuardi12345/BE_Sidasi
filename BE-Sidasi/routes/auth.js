const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool, secretKey } = require('../config/config');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (token == null) return res.sendStatus(401);
  
    jwt.verify(token, secretKey, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
};

// Endpoint for registering new users
router.post('/register', async (req, res) => {
  const { nama, alamat, email, password, no_hp } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    const [result] = await conn.query(
      'INSERT INTO users (nama, alamat, email, password, no_hp, role) VALUES (?, ?, ?, ?, ?, ?)',
      [nama, alamat, email, hashedPassword, no_hp, 'pengguna']
    );
    conn.release();

    res.status(201).json({ message: 'Pengguna berhasil terdaftar' });
  } catch (error) {
    console.error('Kesalahan saat mendaftarkan pengguna:', error);
    res.status(500).json({ message: 'Kesalahan internal server' });
  }
});

// Endpoint for user login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
    conn.release();

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id_user: user.id_user, email: user.email, role: user.role },
      secretKey,
      { expiresIn: '1h' }
    );

    res.json({ token, id_user: user.id_user, role: user.role, nama: user.nama });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to get user data based on token
router.get('/user', authenticateToken, async (req, res) => {
    const userId = req.user.id_user;
  
    try {
      const conn = await pool.getConnection();
      const [rows] = await conn.query('SELECT id_user, nama, alamat, email, no_hp, role FROM users WHERE id_user = ?', [userId]);
      conn.release();
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.json(rows[0]);
    } catch (error) {
      console.error('Error getting user data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
