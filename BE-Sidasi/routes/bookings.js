const express = require("express");
const router = express.Router();
const { pool } = require("../config/config");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { body, param, validationResult } = require("express-validator");

const corsOptions = {
  origin: 'http://localhost:3001',
  credentials: true,
};

router.use(cors(corsOptions));
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

const validateUpdateBooking = [
  body('id_user').optional().isInt(),
  body('tanggal_booking').optional().isISO8601().toDate(),
  body('status_pembayaran').optional().isString(),
  body('products').optional().isArray().custom((products) => {
    return products.every(product => 'id_produk' in product && 'quantity' in product && Number.isInteger(product.id_produk) && Number.isInteger(product.quantity));
  }),
  body('validasi').optional().isIn(['Selesai', 'Belum']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const insertHistory = async (id_booking, id_user) => {
  const sql = `INSERT INTO riwayat (id_booking, id_user) VALUES (?, ?)`;
  await pool.query(sql, [id_booking, id_user]);
};

router.put('/bookings/:id', upload.single('bukti_pembayaran'), validateUpdateBooking, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id_user, tanggal_booking, status_pembayaran, products, validasi } = req.body;
    const bukti_pembayaran = req.file ? `/uploads/${req.file.filename}` : null;

    let updateFields = [];
    let updateValues = [];

    if (id_user) {
      updateFields.push('id_user = ?');
      updateValues.push(id_user);
    }
    if (tanggal_booking) {
      updateFields.push('tanggal_booking = ?');
      updateValues.push(tanggal_booking);
    }
    if (status_pembayaran) {
      updateFields.push('status_pembayaran = ?');
      updateValues.push(status_pembayaran);
    }
    if (bukti_pembayaran) {
      updateFields.push('bukti_pembayaran = ?');
      updateValues.push(bukti_pembayaran);
    }
    if (validasi) {
      updateFields.push('validasi = ?');
      updateValues.push(validasi);
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      const sqlUpdate = `UPDATE bookings SET ${updateFields.join(', ')} WHERE id_booking = ?`;
      await pool.query(sqlUpdate, updateValues);
    }

    // Check if the validation status is 'Selesai' and insert into riwayat if true
    if (validasi === 'Selesai') {
      await insertHistory(id, id_user);
    }

    if (products) {
      const sqlDeleteProducts = `DELETE FROM booking_products WHERE id_booking = ?`;
      await pool.query(sqlDeleteProducts, [id]);

      const sqlInsertProducts = `INSERT INTO booking_products (id_booking, id_produk, quantity) VALUES ?`;
      const bookingProductsValues = products.map(product => [id, product.id_produk, product.quantity]);
      await pool.query(sqlInsertProducts, [bookingProductsValues]);
    }

    res.status(200).json({ message: 'Booking updated successfully' });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post("/bookings", upload.single('bukti_pembayaran'), validateBooking, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id_user, tanggal_booking, status_pembayaran, products } = req.body;
    const bukti_pembayaran = req.file ? `/uploads/${req.file.filename}` : null;

    // Start a transaction
    await connection.beginTransaction();

    // Insert booking into bookings table
    const sqlBooking = `INSERT INTO bookings (id_user, tanggal_booking, status_pembayaran, bukti_pembayaran, validasi) VALUES (?, ?, ?, ?, 'Belum')`;
    const [bookingResult] = await connection.query(sqlBooking, [id_user, tanggal_booking, status_pembayaran, bukti_pembayaran]);
    const bookingId = bookingResult.insertId;

    // Insert products into booking_products table
    const sqlBookingProducts = `INSERT INTO booking_products (id_booking, id_produk, quantity) VALUES ?`;
    const bookingProductsValues = products.map(product => [bookingId, product.id_produk, product.quantity]);
    await connection.query(sqlBookingProducts, [bookingProductsValues]);

    // Insert history into riwayat table
    await insertHistory(bookingId, id_user);

    // Commit the transaction
    await connection.commit();

    res.status(201).send({ status: true, message: "Data Created", data: { bookingId } });
  } catch (error) {
    // Rollback the transaction in case of error
    await connection.rollback();
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    // Release the connection back to the pool
    connection.release();
  }
});

router.get("/booking-details/:id", [
  param('id').isInt()
], async (req, res, next) => {
  try {
    const id = req.params.id;
    const sql = `SELECT bp.id_booking, bp.id_produk, bp.quantity, b.tanggal_booking, b.status_pembayaran, b.validasi 
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

router.get('/bookings', async (req, res, next) => {
  try {
    const sql = `SELECT b.id_booking, b.id_user, u.nama, b.tanggal_booking, b.status_pembayaran, b.bukti_pembayaran, b.validasi,
                 GROUP_CONCAT(bp.id_produk) as produk_ids, GROUP_CONCAT(bp.quantity) as quantities
                 FROM bookings b 
                 LEFT JOIN booking_products bp ON b.id_booking = bp.id_booking
                 LEFT JOIN users u ON b.id_user = u.id_user
                 GROUP BY b.id_booking`;
    const [results] = await pool.query(sql);
    res.status(200).json({ status: true, message: 'Data Fetched', data: results });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/bookings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const sqlDeleteProducts = `DELETE FROM booking_products WHERE id_booking = ?`;
    await pool.query(sqlDeleteProducts, [id]);

    const sqlDeleteBooking = `DELETE FROM bookings WHERE id_booking = ?`;
    await pool.query(sqlDeleteBooking, [id]);

    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
