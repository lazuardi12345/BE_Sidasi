const express = require("express");
const router = express.Router();
const db = require("../config/config");

// Middleware untuk menangani kesalahan umum
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Read all profiles
router.get("/profiles", (req, res) => {
  const sql = `SELECT * FROM profil`;

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

// Read profile by nama_user
router.get("/profiles/:nama_user", (req, res) => {
  const nama_user = req.params.nama_user;
  const sql = `SELECT * FROM profil WHERE nama_user = '${nama_user}'`;

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
          message: "Profile not found",
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

// Create new profile
router.post("/profiles", (req, res) => {
  const { nama_user, alamat, email, foto_user } = req.body;

  const sql = `INSERT INTO profil (nama_user, alamat, email, foto_user) VALUES ('${nama_user}', '${alamat}', '${email}', '${foto_user}')`;

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

// Update profile
router.put("/profiles/:nama_user", (req, res) => {
  const { alamat, email, foto_user } = req.body;
  const nama_user = req.params.nama_user;
  const sql = `UPDATE profil SET alamat = '${alamat}', email = '${email}', foto_user = '${foto_user}' WHERE nama_user = '${nama_user}'`;
  
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
          message: "Profile not found",
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

// Delete profile
router.delete("/profiles/:nama_user", (req, res) => {
  const nama_user = req.params.nama_user;
  const sql = `DELETE FROM profil WHERE nama_user = '${nama_user}'`;

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
          message: "Profile not found",
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
