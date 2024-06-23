const express = require("express");
const router = express.Router();
const { pool } = require("../config/config");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { body, param, validationResult } = require("express-validator");

// Cors configuration
const corsOptions = {
  origin: 'http://localhost:3001',
  credentials: true,
};
router.use(cors(corsOptions));

// Serve static files
router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Error handling middleware
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Validation middleware for booking creation
const validateBooking = [
  body('id_user').isInt(),
  body('tanggal_booking').isISO8601().toDate(),
  body('status_pembayaran').isString(),
  body('products').isString().custom((products) => {
    try {
      const parsedProducts = JSON.parse(products);
      return parsedProducts.every(product => 'id_produk' in product && 'quantity' in product && Number.isInteger(product.id_produk) && Number.isInteger(product.quantity));
    } catch {
      return false;
    }
  }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validation middleware for booking update
const validateUpdateBooking = [
  body('id_user').optional().isInt(),
  body('tanggal_booking').optional().isISO8601().toDate(),
  body('status_pembayaran').optional().isString(),
  body('products').optional().isString().custom((products) => {
    try {
      const parsedProducts = JSON.parse(products);
      return parsedProducts.every(product => 'id_produk' in product && 'quantity' in product && Number.isInteger(product.id_produk) && Number.isInteger(product.quantity));
    } catch {
      return false;
    }
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

// Function to insert history into 'riwayat' table
const insertHistory = async (connection, id_booking, id_user) => {
  try {
    if (!id_user) {
      throw new Error('id_user cannot be null or undefined');
    }
    const sql = `INSERT INTO riwayat (id_booking, id_user) VALUES (?, ?)`;
    await connection.query(sql, [id_booking, id_user]);
  } catch (error) {
    throw new Error(`Failed to insert history: ${error.message}`);
  }
};

// Function to run a transaction with retry logic
const runTransactionWithRetry = async (transactionCallback, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const connection = await pool.getConnection();
    try {
      await transactionCallback(connection);
      return; // If successful, exit function
    } catch (error) {
      if (error.code === 'ER_LOCK_WAIT_TIMEOUT' && attempt < retries) {
        console.warn(`Transaction attempt ${attempt} failed due to lock wait timeout. Retrying after delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // If retries are exhausted or another error, throw it
      }
    } finally {
      connection.release();
    }
  }
};

// Endpoint to create a new booking
router.post("/bookings", upload.single('bukti_pembayaran'), validateBooking, async (req, res, next) => {
  try {
    const { id_user, tanggal_booking, status_pembayaran, products } = req.body;
    const bukti_pembayaran = req.file ? `/uploads/${req.file.filename}` : null;

    await runTransactionWithRetry(async (connection) => {
      await connection.beginTransaction();

      const sqlBooking = `INSERT INTO bookings (id_user, tanggal_booking, status_pembayaran, bukti_pembayaran, validasi) VALUES (?, ?, ?, ?, 'Belum')`;
      const [bookingResult] = await connection.query(sqlBooking, [id_user, tanggal_booking, status_pembayaran, bukti_pembayaran]);
      const bookingId = bookingResult.insertId;

      const parsedProducts = JSON.parse(products);
      const sqlBookingProducts = `INSERT INTO booking_products (id_booking, id_produk, quantity) VALUES ?`;
      const bookingProductsValues = parsedProducts.map(product => [bookingId, product.id_produk, product.quantity]);
      await connection.query(sqlBookingProducts, [bookingProductsValues]);

      await insertHistory(connection, bookingId, id_user);

      await connection.commit();
    });

    res.status(201).send({ status: true, message: "Data Created" });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to update an existing booking
router.put('/bookings/:id', upload.single('bukti_pembayaran'), validateUpdateBooking, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id_user, tanggal_booking, status_pembayaran, products, validasi } = req.body;
    const bukti_pembayaran = req.file ? `/uploads/${req.file.filename}` : null;

    await runTransactionWithRetry(async (connection) => {
      await connection.beginTransaction();

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
        await connection.query(sqlUpdate, updateValues);
      }

      if (validasi === 'Selesai') {
        await insertHistory(connection, id, id_user);
      }

      if (products) {
        const parsedProducts = JSON.parse(products);
        const sqlDeleteProducts = `DELETE FROM booking_products WHERE id_booking = ?`;
        await connection.query(sqlDeleteProducts, [id]);

        const sqlInsertProducts = `INSERT INTO booking_products (id_booking, id_produk, quantity) VALUES ?`;
        const bookingProductsValues = parsedProducts.map(product => [id, product.id_produk, product.quantity]);
        await connection.query(sqlInsertProducts, [bookingProductsValues]);
      }

      await connection.commit();
    });

    res.status(200).json({ message: 'Booking updated successfully' });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to fetch booking details by id
router.get("/booking-details/:id", [
  param('id').isInt().withMessage('ID must be an integer')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = req.params.id;
    console.log(`Fetching booking details for ID: ${id}`);
    
    const sql = `
      SELECT bp.id_booking, u.nama AS nama_pengguna, p.nama_produk, bp.id_produk, bp.quantity, p.harga, p.satuan, b.tanggal_booking, b.status_pembayaran, b.validasi
      FROM booking_products bp 
      JOIN bookings b ON bp.id_booking = b.id_booking 
      JOIN users u ON b.id_user = u.id_user
      JOIN produks p ON bp.id_produk = p.id_produk
      WHERE b.id_booking = ?`;
    
    const [results] = await pool.query(sql, [id]);
    
    res.status(200).json({ status: true, message: "Data Fetched", data: results });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});





// Endpoint to fetch all bookings
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

// Endpoint to delete a booking by id
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
