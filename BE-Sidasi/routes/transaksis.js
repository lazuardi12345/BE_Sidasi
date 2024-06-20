const express = require("express");
const router = express.Router();
const { pool, secretKey } = require("../config/config");
const { param, body, validationResult } = require('express-validator');
const path = require('path');
const cors = require('cors');



const corsOptions = {
  origin: 'http://localhost:3001', // Izinkan request dari origin ini
  credentials: true, // Izinkan pengiriman cookies dari frontend ke backend
};

// Gunakan middleware CORS di router ini
router.use(cors(corsOptions));
router.use(cors());
router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Error handling middleware
const handleErrors = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ status: false, message: "Internal Server Error" });
  }
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ status: false, message: "Validation Error", errors: errors.array() });
  }
  next();
};

// Function to insert history record
const insertHistory = async (id_booking, id_user, id_transaksi) => {
  const sql = `INSERT INTO riwayat (id_booking, id_user, id_transaksi) VALUES (?, ?, ?)`;
  await pool.query(sql, [id_booking, id_user, id_transaksi]);
};

// Read all transactions with booking and user details
router.get("/transaksi", handleErrors(async (req, res) => {
  const sql = `
    SELECT t.*, b.tanggal_booking, b.status_pembayaran, u.nama
    FROM transaksi t
    JOIN bookings b ON t.id_booking = b.id_booking
    JOIN users u ON t.id_user = u.id_user`;
  const [data] = await pool.query(sql);
  res.send({ status: true, message: "GET SUCCESS", data });
}));

// Read transaction by ID with booking and user details
router.get("/transaksi/:id", [
  param('id').isInt()
], validate, handleErrors(async (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT t.*, b.tanggal_booking, b.status_pembayaran, u.nama
    FROM transaksi t
    JOIN bookings b ON t.id_booking = b.id_booking
    JOIN users u ON t.id_user = u.id_user
    WHERE t.id_transaksi = ?`;
  const [data] = await pool.query(sql, [id]);
  if (data.length === 0) {
    return res.status(404).send({ status: false, message: "Transaction not found", data: [] });
  }
  res.send({ status: true, message: "GET SUCCESS", data });
}));

// Update transaction status (for validation)
router.put("/transaksi/:id", [
  param('id').isInt(),
  body('validasi').isIn(['Selesai', 'Belum'])
], validate, handleErrors(async (req, res) => {
  const id = req.params.id;
  const { validasi } = req.body;

  const sql = `UPDATE transaksi SET validasi = ? WHERE id_transaksi = ?`;
  const [data] = await pool.query(sql, [validasi, id]);
  if (data.affectedRows === 0) {
    return res.status(404).send({ status: false, message: "Transaction not found", data: [] });
  }
  res.send({ status: true, message: "Update Success", data });
}));

// Delete transaction
router.delete("/transaksi/:id", [
  param('id').isInt()
], validate, handleErrors(async (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM transaksi WHERE id_transaksi = ?`;
  const [data] = await pool.query(sql, [id]);
  if (data.affectedRows === 0) {
    return res.status(404).send({ status: false, message: "Transaction not found", data: [] });
  }
  res.send({ status: true, message: "Delete Success", data });
}));

// Insert history on transaction creation
router.post("/transaksi", [
  body('id_booking').isInt(),
  body('id_user').isInt(),
  body('tanggal_booking').isISO8601(),
  body('validasi').isIn(['Belum', 'Selesai'])
], validate, handleErrors(async (req, res) => {
  const { id_booking, id_user, tanggal_booking, validasi } = req.body;

  const sql = `INSERT INTO transaksi (id_booking, id_user, tanggal_booking, validasi) VALUES (?, ?, ?, ?)`;
  const [result] = await pool.query(sql, [id_booking, id_user, tanggal_booking, validasi]);

  const id_transaksi = result.insertId;
  await insertHistory(id_booking, id_user, id_transaksi);

  res.status(201).send({ status: true, message: "Transaction Created", data: { id_transaksi } });
}));

module.exports = router;
