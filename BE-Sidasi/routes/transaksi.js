const express = require("express");
const router = express.Router();
const multer = require("multer");
const db = require("../config/config");
const path = require("path");

// Konfigurasi multer untuk menangani pengunggahan file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Menyimpan file di dalam folder 'uploads'
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Menyimpan file dengan nama unik
  }
});

const upload = multer({ storage: storage });

// Middleware untuk menangani kesalahan umum
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Create new transaction
router.post("/transactions", upload.single('bukti_pembayaran'), (req, res) => {
  const { id_user, nama_user, tanggal_booking, validasi } = req.body;

  // Validate required fields
  if (!id_user || !nama_user || !tanggal_booking || !validasi) {
    return res.status(400).send({
      status: false,
      message: "All fields are required",
      data: [],
    });
  }

  // Check if file is uploaded
  if (!req.file) {
    return res.status(400).send({
      status: false,
      message: "Bukti pembayaran is required",
      data: [],
    });
  }

  const bukti_pembayaran = req.file.path; // Path gambar yang diunggah

  const sql = `INSERT INTO transaksi (id_user, nama_user, tanggal_booking, bukti_pembayaran, validasi) VALUES (?, ?, ?, ?, ?)`;
  const values = [id_user, nama_user, tanggal_booking, bukti_pembayaran, validasi];

  db.query(sql, values, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send({
        status: false,
        message: "Error creating data",
        data: [],
      });
    }
    res.send({
      status: true,
      message: "Data Created",
      data: data,
    });
  });
});

// Other routes...

module.exports = router;
