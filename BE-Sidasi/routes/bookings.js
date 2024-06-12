const express = require("express");
const router = express.Router();
const pool = require("../config/config");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { body, param, validationResult } = require("express-validator");

router.use(cors());
router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

const handleErrors = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

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

const insertHistory = async (id_booking, id_user, id_transaksi) => {
  const sql = `INSERT INTO riwayat (id_booking, id_user, id_transaksi) VALUES (?, ?, ?)`;
  await pool.query(sql, [id_booking, id_user, id_transaksi]);
};

// Read all bookings
router.get("/bookings", handleErrors(async (req, res) => {
  const sql = `
    SELECT b.*, u.nama 
    FROM bookings b
    JOIN users u ON b.id_user = u.id_user`;
  const [data] = await pool.query(sql);
  res.send({ status: true, message: "GET SUCCESS", data });
}));

// Read booking by ID
router.get("/bookings/:id", [
  param('id').isInt()
], handleErrors(async (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT b.*, u.nama
    FROM bookings b
    JOIN users u ON b.id_user = u.id_user
    WHERE b.id_booking = ?`;
  const [data] = await pool.query(sql, [id]);
  if (data.length === 0) {
    return res.status(404).send({ status: false, message: "Booking not found", data: [] });
  }
  res.send({ status: true, message: "GET SUCCESS", data });
}));

// Create new booking (with payment proof)
router.post("/bookings", upload.single('bukti_pembayaran'), validateBooking, handleErrors(async (req, res) => {
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
}));

// Update booking (with payment proof)
router.put("/bookings/:id", upload.single('bukti_pembayaran'), [
  param('id').isInt()
], handleErrors(async (req, res) => {
  const id = req.params.id;
  const bukti_pembayaran = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = `UPDATE bookings SET bukti_pembayaran = ? WHERE id_booking = ?`;
  const [data] = await pool.query(sql, [bukti_pembayaran, id]);
  if (data.affectedRows === 0) {
    return res.status(404).send({ status: false, message: "Booking not found", data: [] });
  }
  res.send({ status: true, message: "Update Success", data });
}));

// Delete booking
router.delete("/bookings/:id", [
  param('id').isInt()
], handleErrors(async (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM bookings WHERE id_booking = ?`;
  const [data] = await pool.query(sql, [id]);
  if (data.affectedRows === 0) {
    return res.status(404).send({ status: false, message: "Booking not found", data: [] });
  }
  res.send({ status: true, message: "Delete Success", data });
}));

// Get booking details including products
router.get("/booking-details/:id", [
  param('id').isInt()
], handleErrors(async (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT b.id_booking, u.nama, bp.id_produk, p.nama_produk, bp.quantity
    FROM bookings b
    JOIN users u ON b.id_user = u.id_user
    JOIN booking_products bp ON b.id_booking = bp.id_booking
    JOIN produks p ON bp.id_produk = p.id_produk
    WHERE b.id_booking = ?`;

  const [data] = await pool.query(sql, [id]);
  if (data.length === 0) {
    return res.status(404).send({ status: false, message: "Booking details not found", data: [] });
  }
  res.send({ status: true, message: "GET SUCCESS", data });
}));

module.exports = router;
