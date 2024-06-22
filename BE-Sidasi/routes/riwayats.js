const express = require("express");
const router = express.Router();
const { pool } = require("../config/config");
const cors = require("cors");
const { body, param, validationResult } = require("express-validator");

const corsOptions = {
  origin: 'http://localhost:3001',  // Ensure this matches the frontend origin
  credentials: true,
};

router.use(cors(corsOptions));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

const validateHistory = [
  body('id_booking').isInt(),
  body('id_user').isInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

router.post("/riwayat", validateHistory, async (req, res, next) => {
  try {
    const { id_booking, id_user } = req.body;
    const sql = `INSERT INTO riwayat (id_booking, id_user) VALUES (?, ?)`;
    await pool.query(sql, [id_booking, id_user]);
    res.status(201).send({ status: true, message: "History record created successfully" });
  } catch (error) {
    console.error('Error creating history record:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get("/riwayat/:id", [
  param('id').isInt()
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `SELECT r.id_riwayat, r.id_booking, r.id_user, u.nama, b.tanggal_booking, b.status_pembayaran, b.validasi
                 FROM riwayat r
                 JOIN bookings b ON r.id_booking = b.id_booking
                 JOIN users u ON r.id_user = u.id_user
                 WHERE r.id_riwayat = ?`;
    const [results] = await pool.query(sql, [id]);
    res.status(200).json({ status: true, message: "History record fetched successfully", data: results });
  } catch (error) {
    console.error('Error fetching history record:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/riwayat', async (req, res, next) => {
  try {
    const sql = `SELECT r.id_riwayat, r.id_booking, r.id_user, u.nama, b.tanggal_booking, b.status_pembayaran, b.validasi
                 FROM riwayat r
                 JOIN bookings b ON r.id_booking = b.id_booking
                 JOIN users u ON r.id_user = u.id_user`;
    const [results] = await pool.query(sql);
    res.status(200).json({ status: true, message: 'History records fetched successfully', data: results });
  } catch (error) {
    console.error('Error fetching history records:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/riwayat/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `DELETE FROM riwayat WHERE id_riwayat = ?`;
    await pool.query(sql, [id]);
    res.status(200).json({ message: 'History record deleted successfully' });
  } catch (error) {
    console.error('Error deleting history record:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
