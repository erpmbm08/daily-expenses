
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const router = express.Router();

// User Registration
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, mobile, password, confirmPassword } = req.body;

    if (!fullName || !email || !mobile || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();

    const checkSql =
      "SELECT id FROM users WHERE email = ? OR mobile = ?";

    db.query(checkSql, [cleanEmail, cleanMobile], async (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error.",
        });
      }

      if (results.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email or mobile number already registered.",
        });
      }

      try {
        const passwordHash = await bcrypt.hash(password, 12);

        const insertSql = `
          INSERT INTO users (full_name, email, mobile, password_hash)
          VALUES (?, ?, ?, ?)
        `;

        db.query(
          insertSql,
          [fullName.trim(), cleanEmail, cleanMobile, passwordHash],
          (insertError, result) => {
            if (insertError) {
              return res.status(500).json({
                success: false,
                message: "Could not create account.",
              });
            }

            res.status(201).json({
              success: true,
              message: "Registration successful!",
              userId: result.insertId,
            });
          }
        );
      } catch (hashError) {
        res.status(500).json({
          success: false,
          message: "Password processing failed.",
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
});

// User Login
router.post("/login", (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      message: "Email/mobile and password are required.",
    });
  }

  const cleanIdentifier = identifier.trim().toLowerCase();

  const sql = `
    SELECT id, full_name, email, mobile, password_hash
    FROM users
    WHERE email = ? OR mobile = ?
    LIMIT 1
  `;

  db.query(
    sql,
    [cleanIdentifier, identifier.trim()],
    async (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error.",
        });
      }

      if (results.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid email/mobile or password.",
        });
      }

      const user = results[0];

      try {
        const passwordMatch = await bcrypt.compare(
          password,
          user.password_hash
        );

        if (!passwordMatch) {
          return res.status(401).json({
            success: false,
            message: "Invalid email/mobile or password.",
          });
        }

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
          },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.json({
          success: true,
          message: "Login successful!",
          token,
          user: {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            mobile: user.mobile,
          },
        });
      } catch (loginError) {
        res.status(500).json({
          success: false,
          message: "Login failed.",
        });
      }
    }
  );
});

module.exports = router;
