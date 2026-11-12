
const express = require("express");
const db = require("./db");
const authMiddleware = require("./authMiddleware");

const router = express.Router();

// মাসের হিসাব দেখা
router.get("/summary", authMiddleware, (req, res) => {
  const month = req.query.month;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({
      success: false,
      message: "Please provide month in YYYY-MM format.",
    });
  }

  const monthDate = `${month}-01`;

  const sql = `
    SELECT
      COALESCE(
        (SELECT amount
         FROM monthly_income
         WHERE user_id = ? AND income_month = ?),
        0
      ) AS monthly_income,

      COALESCE(
        (SELECT SUM(amount)
         FROM expenses
         WHERE user_id = ?
         AND expense_date >= ?
         AND expense_date < DATE_ADD(?, INTERVAL 1 MONTH)),
        0
      ) AS total_expense
  `;

  db.query(
    sql,
    [req.user.id, monthDate, req.user.id, monthDate, monthDate],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Could not load monthly summary.",
        });
      }

      const income = Number(results[0].monthly_income);
      const expense = Number(results[0].total_expense);

      res.json({
        success: true,
        month,
        monthlyIncome: income,
        totalExpense: expense,
        remainingBalance: income - expense,
      });
    }
  );
});

// মাসিক Income যোগ বা Update করা
router.post("/", authMiddleware, (req, res) => {
  const { month, amount } = req.body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({
      success: false,
      message: "Invalid month. Use YYYY-MM format.",
    });
  }

  const incomeAmount = Number(amount);

  if (!Number.isFinite(incomeAmount) || incomeAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid income amount.",
    });
  }

  const incomeDate = `${month}-01`;

  const sql = `
    INSERT INTO monthly_income (user_id, income_month, amount)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE amount = VALUES(amount)
  `;

  db.query(
    sql,
    [req.user.id, incomeDate, incomeAmount],
    (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Could not save monthly income.",
        });
      }

      res.json({
        success: true,
        message: "Monthly income saved successfully!",
      });
    }
  );
});

module.exports = router;
