
const express = require("express");
const db = require("./db");
const authMiddleware = require("./authMiddleware");

const router = express.Router();

// Category-wise expense report
router.get("/category-summary", authMiddleware, (req, res) => {
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
      CASE
        WHEN category = 'Others'
          AND custom_category IS NOT NULL
          AND custom_category != ''
        THEN custom_category
        ELSE category
      END AS category,
      SUM(amount) AS totalAmount,
      COUNT(*) AS transactionCount
    FROM expenses
    WHERE user_id = ?
      AND expense_date >= ?
      AND expense_date < DATE_ADD(?, INTERVAL 1 MONTH)
    GROUP BY
      CASE
        WHEN category = 'Others'
          AND custom_category IS NOT NULL
          AND custom_category != ''
        THEN custom_category
        ELSE category
      END
    ORDER BY totalAmount DESC
  `;

  db.query(
    sql,
    [req.user.id, monthDate, monthDate],
    (err, results) => {
      if (err) {
        console.error("Category report error:", err);

        return res.status(500).json({
          success: false,
          message: "Could not load category report.",
        });
      }

      const categories = results.map((item) => ({
        category: item.category,
        totalAmount: Number(item.totalAmount),
        transactionCount: Number(item.transactionCount),
      }));

      res.json({
        success: true,
        month,
        categories,
      });
    }
  );
});

// View expenses
router.get("/", authMiddleware, (req, res) => {
  const sql = `
    SELECT *
    FROM expenses
    WHERE user_id = ?
    ORDER BY expense_date DESC, id DESC
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error("Load expenses error:", err);

      return res.status(500).json({
        success: false,
        message: "Could not load expenses.",
      });
    }

    res.json({
      success: true,
      expenses: results,
    });
  });
});

// Add expense
router.post("/", authMiddleware, (req, res) => {
  const {
    title,
    amount,
    category,
    custom_category,
    expense_date,
  } = req.body;

  if (!title || !amount || !category || !expense_date) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required expense information.",
    });
  }

  const sql = `
    INSERT INTO expenses
    (user_id, title, amount, category, custom_category, expense_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      req.user.id,
      title,
      amount,
      category,
      custom_category || null,
      expense_date,
    ],
    (err, result) => {
      if (err) {
        console.error("Add expense error:", err);

        return res.status(500).json({
          success: false,
          message: "Could not add expense.",
        });
      }

      res.status(201).json({
        success: true,
        message: "Expense added successfully!",
        expenseId: result.insertId,
      });
    }
  );
});

// Delete expense
router.delete("/:id", authMiddleware, (req, res) => {
  const sql = `
    DELETE FROM expenses
    WHERE id = ? AND user_id = ?
  `;

  db.query(
    sql,
    [req.params.id, req.user.id],
    (err, result) => {
      if (err) {
        console.error("Delete expense error:", err);

        return res.status(500).json({
          success: false,
          message: "Could not delete expense.",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Expense not found.",
        });
      }

      res.json({
        success: true,
        message: "Expense deleted successfully!",
      });
    }
  );
});

module.exports = router;
