const express = require("express");
const router = express.Router();
const multer = require("multer");
const pool = require("../config/config");  // Ensure this exports the promise-based pool
const path = require("path");
const cors = require("cors");

router.use(cors());
router.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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

router.get("/produks", handleErrors(async (req, res) => {
  const sql = `SELECT * FROM produks`;
  const [data] = await pool.query(sql);
  res.send({
    status: true,
    message: "GET SUCCESS",
    data: data,
  });
}));

router.get("/produks/:id", handleErrors(async (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM produks WHERE id_produk = ?`;  // Correct column name
  const [data] = await pool.query(sql, [id]);
  if (data.length === 0) {
    return res.status(404).send({
      status: false,
      message: "Product not found",
      data: [],
    });
  }
  res.send({
    status: true,
    message: "GET SUCCESS",
    data: data,
  });
}));

router.post("/produks", upload.single('foto_produk'), handleErrors(async (req, res) => {
  const { nama_produk, kategori, harga, stok, satuan, status } = req.body;
  const foto_produk = `/uploads/${req.file.filename}`;
  const sql = `INSERT INTO produks (nama_produk, kategori, harga, stok, satuan, status, foto_produk) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const values = [nama_produk, kategori, harga, stok, satuan, status, foto_produk];
  const [data] = await pool.query(sql, values);
  res.send({
    status: true,
    message: "Data Created",
    data: data,
  });
}));

router.put("/produks/:id", upload.single('foto_produk'), handleErrors(async (req, res) => {
  const { nama_produk, kategori, harga, stok, satuan, status } = req.body;
  const id = req.params.id;
  const foto_produk = req.file ? `/uploads/${req.file.filename}` : req.body.foto_produk;
  const sql = `UPDATE produks SET nama_produk = ?, kategori = ?, harga = ?, stok = ?, satuan = ?, status = ?, foto_produk = ? WHERE id_produk = ?`;  // Correct column name
  const values = [nama_produk, kategori, harga, stok, satuan, status, foto_produk, id];
  const [data] = await pool.query(sql, values);
  if (data.affectedRows === 0) {
    return res.status(404).send({
      status: false,
      message: "Product not found",
      data: [],
    });
  }
  res.send({
    status: true,
    message: "Update Success",
    data: data,
  });
}));

router.delete("/produks/:id", handleErrors(async (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM produks WHERE id_produk = ?`;  // Correct column name
  const [data] = await pool.query(sql, [id]);
  if (data.affectedRows === 0) {
    return res.status(404).send({
      status: false,
      message: "Product not found",
      data: [],
    });
  }
  res.send({
    status: true,
    message: "Delete Success",
    data: data,
  });
}));

module.exports = router;
