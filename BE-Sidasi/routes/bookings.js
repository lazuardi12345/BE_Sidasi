const express = require("express");
const router = express.Router();
const db = require("../config/config");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Middleware untuk menangani kesalahan umum
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Read all table bookings
router.get("/bookings", (req, res) => {
  const sql = `SELECT * FROM bookings`;

  db.query(sql, (err, data) => {
    if (err) {
      res.status(500).send({
        status: false,
        message: "Error fetching data",
        data: [],
      });
    } else {
      res.send({
        status: true,
        message: "GET SUCCESS",
        data: data,
      });
    }
  });
});

// Read table booking by Id
router.get("/bookings/:id", (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM bookings WHERE id_booking = ${id}`;

  db.query(sql, (err, data) => {
    if (err) {
      res.status(500).send({
        status: false,
        message: "Error fetching data",
        data: [],
      });
    } else {
      if (data.length === 0) {
        res.status(404).send({
          status: false,
          message: "Booking not found",
          data: [],
        });
      } else {
        res.send({
          status: true,
          message: "GET SUCCESS",
          data: data,
        });
      }
    }
  });
});

// Create new table booking
router.post("/bookings", upload.single('screenshot'), (req, res) => {
  const { id_user, nama_user, tanggal_booking, status_pembayaran, id_bookings } = req.body;
  const screenshot = req.file ? req.file.path : null;

  const sql = `INSERT INTO bookings (id_user, nama_user, tanggal_booking, status_pembayaran, id_bookings, screenshot) VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [id_user, nama_user, tanggal_booking, status_pembayaran, id_bookings, screenshot], (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send({
        status: false,
        message: "Error creating data",
        data: [],
      });
    } else {
      res.status(201).send({
        status: true,
        message: "Data Created",
        data: data,
      });
    }
  });
});

// Update table booking
router.put("/bookings/:id", (req, res) => {
  const { id_user, nama_user, tanggal_booking, status_pembayaran } = req.body;
  const id = req.params.id;
  const sql = `UPDATE bookings SET id_user = ?, nama_user = ?, tanggal_booking = ?, status_pembayaran = ? WHERE id_booking = ?`;
  
  db.query(sql, [id_user, nama_user, tanggal_booking, status_pembayaran, id], (err, data) => {
    if (err) {
      res.status(500).send({
        status: false,
        message: `Error updating data, ${err}`,
        data: [],
      });
    } else {
      if (data.affectedRows === 0) {
        res.status(404).send({
          status: false,
          message: "Booking not found",
          data: [],
        });
      } else {
        res.send({
          status: true,
          message: "Update Success",
          data: data,
        });
      }
    }
  });
});

// Delete table booking
router.delete("/bookings/:id", (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM bookings WHERE id_booking = ?`;

  db.query(sql, [id], (err, data) => {
    if (err) {
      res.status(500).send({
        status: false,
        message: "Error deleting data",
        data: [],
      });
    } else {
      if (data.affectedRows === 0) {
        res.status(404).send({
          status: false,
          message: "Booking not found",
          data: [],
        });
      } else {
        res.send({
          status: true,
          message: "Delete Success",
          data: data,
        });
      }
    }
  });
});

module.exports = router;
