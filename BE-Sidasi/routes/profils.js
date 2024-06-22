const express = require("express");
const router = express.Router();
const { pool } = require("../config/config");
const multer = require("multer");
const path = require("path");
const fs = require('fs');
const jwt = require('jsonwebtoken'); // Import JWT library
const cors = require("cors");

const corsOptions = {
  origin: 'http://localhost:3001', // Izinkan request dari origin ini
  credentials: true, // Izinkan pengiriman cookies dari frontend ke backend
};

// Gunakan middleware CORS di router ini
router.use(cors(corsOptions));

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
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

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|gif/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Images Only!');
    }
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401); // Unauthorized if no token

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden if token is invalid
    req.user = user; // Set user object from decoded token
    next(); // Proceed to next middleware
  });
};

// Middleware for handling common errors
router.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Something went wrong!");
});

// Add profile
router.post("/profils", verifyToken, upload.single('foto'), async (req, res) => {
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
router.get("/profils/:id", verifyToken, (req, res) => {
  const id_profile = req.params.id;
  const sql = `
    SELECT p.id_profil, p.foto, u.nama, u.alamat, u.no_hp, u.email
    FROM profils p
    JOIN users u ON p.id_user = u.id_user
    WHERE p.id_profil = ?`;

  pool.query(sql, [id_profile], (err, data) => {
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
router.put("/profils/:id", verifyToken, upload.single('foto'), async (req, res) => {
  try {
    const id_profile = req.params.id;
    const foto = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `UPDATE profils SET foto = ? WHERE id_profil = ?`;

    const [data] = await pool.query(sql, [foto, id_profile]);
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
router.delete("/profils/:id", verifyToken, async (req, res) => {
  try {
    const id_profile = req.params.id;

    const sql = `DELETE FROM profils WHERE id_profil = ?`;

    const [data] = await pool.query(sql, [id_profile]);
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

// Get all profiles
router.get("/profils", verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT p.id_profil, p.foto, u.id_user, u.nama, u.alamat, u.no_hp, u.email
      FROM profils p
      JOIN users u ON p.id_user = u.id_user`;

    const [data] = await pool.query(sql);
    
    // Check if data is not an array or empty
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).send({
        status: false,
        message: "No profiles found",
        data: [],
      });
    }

    res.send({
      status: true,
      message: "GET All Profiles",
      data: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      status: false,
      message: "Error fetching profiles",
      data: [],
    });
  }
});

module.exports = router;