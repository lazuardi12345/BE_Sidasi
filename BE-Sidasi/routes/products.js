const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pool } = require('../config/config');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Endpoint to get all products
router.get('/produks', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM produks'); // Pastikan tabel yang dipanggil adalah 'produk'
    conn.release();
    res.json({ data: rows });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Endpoint to add a new product
router.post('/produks', upload.single('foto_produk'), async (req, res) => {
  const { nama_produk, kategori, harga, stok, satuan, status } = req.body;
  const foto_produk = `/uploads/${req.file.filename}`;

  try {
    const conn = await pool.getConnection();
    const [result] = await conn.query(
      'INSERT INTO produk (nama_produk, kategori, harga, stok, satuan, status, foto_produk) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nama_produk, kategori, harga, stok, satuan, status, foto_produk]
    );
    conn.release();

    res.status(201).json({ message: 'Product added successfully', data: { id: result.insertId, nama_produk, kategori, harga, stok, satuan, status, foto_produk } });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to update a product
router.put('/produks/:id', upload.single('foto_produk'), async (req, res) => {
  const { nama_produk, kategori, harga, stok, satuan, status } = req.body;
  const { id } = req.params;
  const foto_produk = req.file ? `/uploads/${req.file.filename}` : req.body.foto_produk;

  try {
    const conn = await pool.getConnection();
    await conn.query(
      'UPDATE produks SET nama_produk = ?, kategori = ?, harga = ?, stok = ?, satuan = ?, status = ?, foto_produk = ? WHERE id_produk = ?',
      [nama_produk, kategori, harga, stok, satuan, status, foto_produk, id]
    );
    conn.release();

    res.json({ message: 'Product updated successfully', data: { id, nama_produk, kategori, harga, stok, satuan, status, foto_produk } });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to delete a product
router.delete('/produks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const conn = await pool.getConnection();
    await conn.query('DELETE FROM produk WHERE id_produk = ?', [id]);
    conn.release();

    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
