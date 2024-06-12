const express = require("express");
const router = express.Router();
const pool = require("../config/config");
const { param, validationResult } = require('express-validator');

// Middleware for error handling
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

// Get all riwayat with joined tables
router.get("/riwayat", handleErrors(async (req, res) => {
  const sql = `
    SELECT 
      riwayat.*, 
      users.nama, 
      bookings.tanggal_booking, 
      bookings.status_pembayaran, 
      transaksi.validasi 
    FROM 
      riwayat
    JOIN 
      users ON riwayat.id_user = users.id_user
    JOIN 
      bookings ON riwayat.id_booking = bookings.id_booking
    JOIN 
      transaksi ON riwayat.id_transaksi = transaksi.id_transaksi
  `;
  const [data] = await pool.query(sql);
  res.send({ status: true, message: "GET SUCCESS", data });
}));

// Get riwayat by ID with joined tables
router.get("/riwayat/:id", [
  param('id').isInt() // Ensure ID is an integer
], validate, handleErrors(async (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT 
      riwayat.*, 
      users.nama, 
      bookings.tanggal_booking, 
      bookings.status_pembayaran, 
      transaksi.validasi 
    FROM 
      riwayat
    JOIN 
      users ON riwayat.id_user = users.id_user
    JOIN 
      bookings ON riwayat.id_booking = bookings.id_booking
    JOIN 
      transaksi ON riwayat.id_transaksi = transaksi.id_transaksi
    WHERE 
      riwayat.id_riwayat = ?
  `;
  const [data] = await pool.query(sql, [id]);
  if (data.length === 0) {
    return res.status(404).send({ status: false, message: "History not found", data: [] });
  }
  res.send({ status: true, message: "GET SUCCESS", data });
}));

module.exports = router;
