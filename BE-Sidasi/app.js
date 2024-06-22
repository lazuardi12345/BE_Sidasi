const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

// const indexRouter = require('./routes/index');
const productsRouter = require('./routes/products');
const bookingsRouter = require('./routes/bookings');
// const transaksisRouter = require('./routes/transaksis');
const riwayatsRouter = require('./routes/riwayats');
const profilsRouter = require('./routes/profils');
const pelanggansRouter = require('./routes/pelanggans');
const authRouter = require('./routes/auth');

const app = express();

// Set view engine to Pug (opsional, tergantung pada kebutuhan aplikasi Anda)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware setup
app.use(logger('dev')); // Middleware untuk logging
app.use(express.json()); // Middleware untuk parsing body berformat JSON
app.use(express.urlencoded({ extended: false })); // Middleware untuk parsing body dari form URL-encoded
app.use(cookieParser()); // Middleware untuk parsing cookie
app.use(express.static(path.join(__dirname, 'public'))); // Middleware untuk serving static files dari folder 'public'
app.use(cors()); // Middleware untuk mengaktifkan CORS

// Route setup
// app.use('/', indexRouter);
app.use('/products', productsRouter);
app.use('/bookings', bookingsRouter);
// app.use('/transaksis', transaksisRouter);
app.use('/riwayats', riwayatsRouter);
app.use('/profils', profilsRouter);
app.use('/pelanggans', pelanggansRouter);
app.use('/auth', authRouter);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error'); // Anda harus memiliki template error.pug di folder views jika menggunakan render
});

module.exports = app;
