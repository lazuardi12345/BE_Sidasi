const express = require('express');
const router = express.Router();
const { pool } = require('../config/config');
const authenticateToken = require('../middleware/authenticateToken');

// GET all pelanggans dengan data dari users
router.get('/pelanggans', authenticateToken, async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query(`
            SELECT p.id, u.nama, u.alamat, u.no_hp, u.email, u.foto 
            FROM pelanggans p
            INNER JOIN users u ON p.id_user = u.id_user
        `);
        conn.release();
        res.json(rows);
    } catch (error) {
        console.error('Error getting pelanggans:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET pelanggan by id_pelanggan dengan data dari users
router.get('/pelanggans/:id', authenticateToken, async (req, res) => {
    const idPelanggan = req.params.id;

    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query(`
            SELECT p.id, u.nama, u.alamat, u.no_hp, u.email, u.foto 
            FROM pelanggans p
            INNER JOIN users u ON p.id_user = u.id_user
            WHERE p.id = ?
        `, [idPelanggan]);
        conn.release();

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Pelanggan not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error getting pelanggan by id:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST create a new pelanggan
router.post('/pelanggans', authenticateToken, async (req, res) => {
    const { id_user } = req.body;

    try {
        if (!id_user) {
            return res.status(400).json({ message: 'ID User is required' });
        }

        const conn = await pool.getConnection();
        const [result] = await conn.query('INSERT INTO pelanggans (id_user) VALUES (?)', [id_user]);
        conn.release();

        res.status(201).json({ message: 'Pelanggan successfully created', id_pelanggan: result.insertId });
    } catch (error) {
        console.error('Error creating pelanggan:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
