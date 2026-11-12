
const mysql = require("mysql2");
require("dotenv").config({ override: true });

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: process.env.TIDB_ENABLE_SSL === "true"
    ? { minVersion: "TLSv1.2" }
    : undefined
});

db.connect((err) => {
  if (err) {
    console.error("Database Connection Failed:", err.code, err.message);
    return;
  }

  console.log("TiDB Cloud Connected Successfully!");
});

module.exports = db;
