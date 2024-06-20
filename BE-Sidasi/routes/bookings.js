const express = require("express");
const router = express.Router();
const { pool } = require("../config/config"); // Make sure to replace with your actual config
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { body, param, validationResult } = require("express-validator");


const corsOptions = {
  origin: 'http://localhost:3001', // Izinkan request dari origin ini
  credentials: true, // Izinkan pengiriman cookies dari frontend ke backend
};

// Gunakan middleware CORS di router ini
router.use(cors(corsOptions));

// Middleware
router.use(cors());
router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Multer Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Global Error Handling
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Middleware for booking validation
const validateBooking = [
  body('id_user').isInt(),
  body('tanggal_booking').isISO8601().toDate(),
  body('status_pembayaran').isString(),
  body('products').isArray().custom((products) => {
    return products.every(product => 'id_produk' in product && 'quantity' in product && Number.isInteger(product.id_produk) && Number.isInteger(product.quantity));
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Function to insert data into the history table
const insertHistory = async (id_booking, id_user, id_transaksi) => {
  const sql = `INSERT INTO riwayat (id_booking, id_user, id_transaksi) VALUES (?, ?, ?)`;
  await pool.query(sql, [id_booking, id_user, id_transaksi]);
};

// Create new booking (with payment proof)
router.post("/bookings", upload.single('bukti_pembayaran'), validateBooking, async (req, res, next) => {
  try {
    const { id_user, tanggal_booking, status_pembayaran, products } = req.body;
    const bukti_pembayaran = req.file ? `/uploads/${req.file.filename}` : null;

    const sqlBooking = `INSERT INTO bookings (id_user, tanggal_booking, status_pembayaran, bukti_pembayaran) VALUES (?, ?, ?, ?)`;
    const [bookingResult] = await pool.query(sqlBooking, [id_user, tanggal_booking, status_pembayaran, bukti_pembayaran]);

    const bookingId = bookingResult.insertId;
    const sqlBookingProducts = `INSERT INTO booking_products (id_booking, id_produk, quantity) VALUES ?`;
    const bookingProductsValues = products.map(product => [bookingId, product.id_produk, product.quantity]);

    await pool.query(sqlBookingProducts, [bookingProductsValues]);

    // Add entry to transaksi table
    const sqlTransaksi = `INSERT INTO transaksi (id_booking, id_user, tanggal_booking, validasi) VALUES (?, ?, ?, ?)`;
    const [transaksiResult] = await pool.query(sqlTransaksi, [bookingId, id_user, tanggal_booking, 'Belum']);

    const transaksiId = transaksiResult.insertId;

    // Insert into riwayat table
    await insertHistory(bookingId, id_user, transaksiId);

    res.status(201).send({ status: true, message: "Data Created", data: { bookingId, transaksiId } });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Additional route to fetch booking details by ID
router.get("/booking-details/:id", [
  param('id').isInt()
], async (req, res, next) => {
  try {
    const id = req.params.id;
    const sql = `SELECT bp.id_booking, bp.id_produk, bp.quantity, b.tanggal_booking, b.status_pembayaran 
                 FROM booking_products bp 
                 JOIN bookings b ON bp.id_booking = b.id_booking 
                 WHERE b.id_booking = ?`;
    const [results] = await pool.query(sql, [id]);
    res.status(200).json({ status: true, message: "Data Fetched", data: results });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
