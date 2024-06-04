const express = require("express");
const router = express.Router();
const db = require("../config/config");

// Middleware untuk menangani kesalahan umum
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Read all history
router.get("/history", (req, res) => {
  const sql = `SELECT * FROM riwayat`;

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

// Read history by id_booking
router.get("/history/:id_booking", (req, res) => {
  const id_booking = req.params.id_booking;
  const sql = `SELECT * FROM riwayat WHERE id_booking = ${id_booking}`;

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
          message: "History not found",
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

// Create new history
router.post("/history", (req, res) => {
  const { id_booking, id_user, nama_user, tanggal_booking, validasi } = req.body;

  const sql = `INSERT INTO riwayat (id_booking, id_user, nama_user, tanggal_booking, validasi) VALUES ('${id_booking}', '${id_user}', '${nama_user}', '${tanggal_booking}', '${validasi}')`;

  db.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send({
        status: false,
        message: "Error creating data",
        data: [],
      });
    } else {
      res.send({
        status: true,
        message: "Data Created",
        data: data,
      });
    }
  });
});

// Update history
router.put("/history/:id_booking", (req, res) => {
  const { id_user, nama_user, tanggal_booking, validasi } = req.body;
  const id_booking = req.params.id_booking;
  const sql = `UPDATE riwayat SET id_user = '${id_user}', nama_user = '${nama_user}', tanggal_booking = '${tanggal_booking}', validasi = '${validasi}' WHERE id_booking = ${id_booking}`;
  
  db.query(sql, (err, data) => {
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
          message: "History not found",
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

// Delete history
router.delete("/history/:id_booking", (req, res) => {
  const id_booking = req.params.id_booking;
  const sql = `DELETE FROM riwayat WHERE id_booking = ${id_booking}`;

  db.query(sql, (err, data) => {
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
          message: "History not found",
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
