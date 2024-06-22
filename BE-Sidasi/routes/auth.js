const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
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

// Setup multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Endpoint for registering new users
router.post('/register', async (req, res) => {
    const { nama, alamat, email, password, no_hp } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const conn = await pool.getConnection();
        await conn.beginTransaction();

        try {
            const [result] = await conn.query(
                'INSERT INTO users (nama, alamat, email, password, no_hp, foto, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [nama, alamat, email, hashedPassword, no_hp, '/uploads/default.png', 'pengguna']
            );

            const userId = result.insertId;

            await conn.commit();
            conn.release();

            res.status(201).json({ message: 'Pengguna berhasil terdaftar' });
        } catch (error) {
            await conn.rollback();
            conn.release();
            console.error('Kesalahan saat mendaftarkan pengguna:', error);
            res.status(500).json({ message: 'Kesalahan internal server' });
        }
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
        const [rows] = await conn.query('SELECT id_user, nama, alamat, email, foto, no_hp, role FROM users WHERE id_user = ?', [userId]);
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

// Endpoint to get user data by id
router.get('/user/:id', authenticateToken, async (req, res) => {
    const userId = req.params.id;

    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query('SELECT id_user, nama, alamat, email, foto, no_hp, role FROM users WHERE id_user = ?', [userId]);
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

// Endpoint to update user data
router.put('/user', authenticateToken, upload.single('foto'), async (req, res) => {
    const userId = req.user.id_user;
    const { nama, alamat, email, password, no_hp } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : req.body.foto; // Get foto from file upload or body

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        try {
            let hashedPassword;
            if (password) {
                hashedPassword = await bcrypt.hash(password, 10);
            }

            const [result] = await conn.query(
                'UPDATE users SET nama = ?, alamat = ?, email = ?, password = COALESCE(?, password), no_hp = ?, foto = ? WHERE id_user = ?',
                [nama, alamat, email, hashedPassword, no_hp, foto, userId]
            );

            await conn.commit();
            conn.release();

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({ message: 'User data updated successfully' });
        } catch (error) {
            await conn.rollback();
            conn.release();
            console.error('Error updating user data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Endpoint to update user data by id
router.put('/user/:id', authenticateToken, upload.single('foto'), async (req, res) => {
    const userId = req.params.id;
    const { nama, alamat, email, password, no_hp } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : req.body.foto;

    try {
        const conn = await pool.getConnection();
        await conn.beginTransaction();

        try {
            let hashedPassword = null;
            if (password) {
                hashedPassword = await bcrypt.hash(password, 10);
            }

            const [result] = await conn.query(
                'UPDATE users SET nama = ?, alamat = ?, email = ?, password = COALESCE(?, password), no_hp = ?, foto = ? WHERE id_user = ?',
                [nama, alamat, email, hashedPassword, no_hp, foto, userId]
            );

            await conn.commit();
            conn.release();

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({ message: 'User data updated successfully' });
        } catch (error) {
            await conn.rollback();
            conn.release();
            console.error('Error updating user data:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Endpoint to get all users
router.get('/users', authenticateToken, async (req, res) => {
  try {
      const conn = await pool.getConnection();
      const [rows] = await conn.query('SELECT id_user, nama, alamat, email, foto, no_hp, role FROM users');
      conn.release();

      res.json(rows);
  } catch (error) {
      console.error('Error getting all users:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
