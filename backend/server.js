
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");
const authRoutes = require("./authRoutes");
const authMiddleware = require("./authMiddleware");
const expenseRoutes = require("./expenseRoutes");
const incomeRoutes = require("./incomeRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log("REQUEST RECEIVED:", req.method, req.url);
  next();
});

// Home route
app.get("/", (req, res) => {
  res.send("Daily Expenses Backend is Running!");
});

// Database test
app.get("/api/test", (req, res) => {
  db.query("SELECT 1 AS result", (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }

    res.json({
      success: true,
      message: "Database Connected Successfully!",
    });
  });
});

// Registration and Login
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/income", incomeRoutes);
console.log(
  "Loaded Auth Routes:",
  authRoutes.stack.map((route) => route.route.path)
);

// Get logged-in user's profile
app.get("/api/profile", authMiddleware, (req, res) => {
  db.query(
    `SELECT id, full_name, email, mobile
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error.",
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      res.json({
        success: true,
        user: results[0],
      });
    }
  );
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
