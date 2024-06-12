const express = require("express");
const router = express.Router();
const pool = require("../config/config");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

// Apply CORS middleware
router.use(cors());

// Serve static files from the public/uploads directory
router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Store files in 'public/uploads'
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filenames
  }
});

const upload = multer({ storage: storage });

// Middleware for handling common errors
router.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Add profile
router.post("/profils", upload.single('foto'), async (req, res) => {
  try {
    const { id_user } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `INSERT INTO profils (id_user, foto) VALUES (?, ?)`;

    const [data] = await pool.query(sql, [id_user, foto]);
    res.status(201).send({
      status: true,
      message: "Profile Created",
      data: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: false,
      message: "Error creating profile",
      data: [],
    });
  }
});

// Get profile with user information
router.get("/profils/:id_user", (req, res) => {
  const id_user = req.params.id_user;
  const sql = `
    SELECT p.id_profil, p.foto, u.nama, u.alamat, u.no_hp, u.email
    FROM profils p
    JOIN users u ON p.id_user = u.id_user
    WHERE p.id_user = ?`;

  pool.query(sql, [id_user], (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send({
        status: false,
        message: "Error fetching profile",
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
// Update profile
router.put("/profils/:id_user", upload.single('foto'), async (req, res) => {
  try {
    const id_user = req.params.id_user;
    const { foto } = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `UPDATE profils SET foto = ? WHERE id_user = ?`;

    const [data] = await pool.query(sql, [foto, id_user]);
    if (data.affectedRows === 0) {
      return res.status(404).send({
        status: false,
        message: "Profile not found",
        data: [],
      });
    }
    res.send({
      status: true,
      message: "Profile Updated",
      data: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: false,
      message: "Error updating profile",
      data: [],
    });
  }
});

// Delete profile
router.delete("/profils/:id_user", async (req, res) => {
  try {
    const id_user = req.params.id_user;

    const sql = `DELETE FROM profils WHERE id_user = ?`;

    const [data] = await pool.query(sql, [id_user]);
    if (data.affectedRows === 0) {
      return res.status(404).send({
        status: false,
        message: "Profile not found",
        data: [],
      });
    }
    res.send({
      status: true,
      message: "Profile Deleted",
      data: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: false,
      message: "Error deleting profile",
      data: [],
    });
  }
});


module.exports = router;
