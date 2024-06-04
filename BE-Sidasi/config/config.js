const mySql = require("mysql2");

const db = mySql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "sidasi",
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

module.exports = db;
