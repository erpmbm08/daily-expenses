import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const categories = [
  { name: "Food", icon: "🍔" },
  { name: "Transport", icon: "🚗" },
  { name: "Shopping", icon: "🛍️" },
  { name: "Bills", icon: "🧾" },
  { name: "Health", icon: "💊" },
  { name: "Education", icon: "📚" },
  { name: "Rent", icon: "🏠" },
  { name: "Electricity", icon: "💡" },
  { name: "Water", icon: "💧" },
  { name: "Mobile & Internet", icon: "📱" },
  { name: "Entertainment", icon: "🎬" },
  { name: "Travel", icon: "✈️" },
  { name: "Personal Care", icon: "🧴" },
  { name: "Others", icon: "📦" },
];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("dailyExpensesToken") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dailyExpensesUser")) || null;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState("login");
  const [transactions, setTransactions] = useState([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [customCategory, setCustomCategory] = useState("");
  const [showCategories, setShowCategories] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [identifier, setIdentifier] = useState("");

  const [profile, setProfile] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [categorySummary, setCategorySummary] = useState([]);
  const [showCategoryReport, setShowCategoryReport] = useState(false);
  const [incomeInput, setIncomeInput] = useState("");
  const [savingIncome, setSavingIncome] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  function money(value) {
    return (
      "৳" +
      Number(value || 0).toLocaleString("en-BD", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function getCategoryIcon(name) {
    return categories.find((item) => item.name === name)?.icon || "📦";
  }

  function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(
      String(dateString).slice(0, 10) + "T00:00:00"
    );

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function logout() {
    localStorage.removeItem("dailyExpensesToken");
    localStorage.removeItem("dailyExpensesUser");

    setToken("");
    setUser(null);
    setProfile(null);
    setTransactions([]);
    setMonthlyIncome(0);
    setTotalExpense(0);
    setCategorySummary([]);
    setPage("login");
    setError("");
    setMessage("");
  }

  // LOGIN
  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Login failed.");
      }

      localStorage.setItem("dailyExpensesToken", result.token);
      localStorage.setItem(
        "dailyExpensesUser",
        JSON.stringify(result.user)
      );

      setToken(result.token);
      setUser(result.user);
      setPassword("");
      setPage("dashboard");
      setMessage("Login successful!");
    } catch (err) {
      setError(err.message);
    }
  }

  // REGISTRATION
  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          mobile,
          password,
          confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Registration failed.");
      }

      setMessage("Registration successful! Please login.");
      setIdentifier(email);
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setEmail("");
      setMobile("");
      setPage("login");
    } catch (err) {
      setError(err.message);
    }
  }

  // LOAD EXPENSES
  async function loadExpenses() {
    if (!token) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/expenses`, {
        headers: authHeaders,
      });

      const data = await response.json();

      if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Could not load expenses.");
      }

      setTransactions(data.expenses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // LOAD MONTHLY SUMMARY
  async function loadMonthlySummary(month) {
    const validMonth =
      typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
        ? month
        : selectedMonth;

    if (!token || !validMonth) return;

    try {
      const response = await fetch(
        `${API_URL}/income/summary?month=${validMonth}`,
        { headers: authHeaders }
      );

      const data = await response.json();

      if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load monthly summary."
        );
      }

      setMonthlyIncome(Number(data.monthlyIncome || 0));
      setTotalExpense(Number(data.totalExpense || 0));

      setIncomeInput(
        Number(data.monthlyIncome) > 0
          ? String(data.monthlyIncome)
          : ""
      );
    } catch (err) {
      setError(err.message);
    }
  }

  // LOAD CATEGORY REPORT
  async function loadCategorySummary(month) {
    const validMonth =
      typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
        ? month
        : selectedMonth;

    if (!token || !validMonth) return;

    try {
      const response = await fetch(
        `${API_URL}/expenses/category-summary?month=${validMonth}`,
        { headers: authHeaders }
      );

      const data = await response.json();

      if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Could not load category report."
        );
      }

      setCategorySummary(data.categories || []);
    } catch (err) {
      setError(err.message);
    }
  }

  // SAVE MONTHLY INCOME
  async function saveMonthlyIncome(e) {
    e.preventDefault();

    if (!incomeInput || Number(incomeInput) <= 0) {
      setError("Please enter a valid monthly income.");
      return;
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)) {
      setError("Please select a valid month.");
      return;
    }

    try {
      setSavingIncome(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/income`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          month: selectedMonth,
          amount: Number(incomeInput),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Could not save monthly income."
        );
      }

      await loadMonthlySummary(selectedMonth);
      setMessage("Monthly income saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingIncome(false);
    }
  }

 // EXPORT CATEGORY REPORT TO EXCEL
function downloadCategoryExcel() {
  if (categorySummary.length === 0) {
    setError("There is no category report to download.");
    return;
  }

  const monthlyTransactions = transactions.filter((item) => {
    const date = String(item.expense_date || "").slice(0, 10);
    return date.startsWith(selectedMonth);
  });

  const rows = categorySummary.map((item, index) => {
    const categoryTransactions = monthlyTransactions
      .filter((expense) => expense.category === item.category)
      .map((expense) => String(expense.expense_date).slice(0, 10))
      .filter((date) => date);

    return {
      SL: index + 1,
      Date: [...new Set(categoryTransactions)].sort().join(", "),
      Category: item.category,
      "Total Expense (BDT)": Number(item.totalAmount),
      Transactions: Number(item.transactionCount),
    };
  });

  rows.push({
    SL: "",
    Date: "",
    Category: "TOTAL",
    "Total Expense (BDT)": categorySummary.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    ),
    Transactions: categorySummary.reduce(
      (sum, item) => sum + Number(item.transactionCount || 0),
      0
    ),
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 24 },
    { wch: 22 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Category Report"
  );

  XLSX.writeFile(
    workbook,
    `Category-Report-${selectedMonth}.xlsx`
  );
}
// EXPORT DATE-WISE TRANSACTIONS TO EXCEL
function downloadDateWiseExcel() {
  const monthlyTransactions = transactions
    .filter((item) => {
      const date = String(item.expense_date || "").slice(0, 10);
      return date.startsWith(selectedMonth);
    })
    .sort((a, b) =>
      String(a.expense_date).localeCompare(String(b.expense_date))
    );

  if (monthlyTransactions.length === 0) {
    setError("No transactions found for this month.");
    return;
  }

  const rows = monthlyTransactions.map((item, index) => ({
    SL: index + 1,
    Date: String(item.expense_date).slice(0, 10),
    Description: item.title,
    Category: item.category,
    "Amount (BDT)": Number(item.amount),
  }));

  rows.push({
    SL: "",
    Date: "",
    Description: "TOTAL EXPENSE",
    Category: "",
    "Amount (BDT)": monthlyTransactions.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    ),
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 28 },
    { wch: 22 },
    { wch: 20 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Date Wise Transactions"
  );

  XLSX.writeFile(
    workbook,
    `Date-Wise-Transactions-${selectedMonth}.xlsx`
  );
}
  // LOAD PROFILE
  async function loadProfile() {
    if (!token) return;

    try {
      setError("");

      const response = await fetch(`${API_URL}/profile`, {
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load profile.");
      }

      setProfile(data.user);
      setPage("profile");
    } catch (err) {
      setError(err.message);
    }
  }

  // INITIAL LOAD
  useEffect(() => {
    if (token) {
      setPage("dashboard");
      loadExpenses();
      loadMonthlySummary(selectedMonth);
      loadCategorySummary(selectedMonth);
    } else {
      setPage("login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // MONTH CHANGE
  function handleMonthChange(e) {
    const month = e.target.value;

    setSelectedMonth(month);
    setError("");

    if (month) {
      loadMonthlySummary(month);
      loadCategorySummary(month);
    }
  }

  // ADD EXPENSE
  async function addExpense(e) {
    e.preventDefault();

    if (!title.trim() || !amount || Number(amount) <= 0) {
      setError("Please enter a valid expense and amount.");
      return;
    }

    if (category === "Others" && !customCategory.trim()) {
      setError("Please enter your custom category name.");
      return;
    }

    const finalCategory =
      category === "Others" ? customCategory.trim() : category;

    const expenseData = {
      title: title.trim(),
      amount: Number(amount),
      category: finalCategory,
      custom_category:
        category === "Others" ? customCategory.trim() : "",
      expense_date: new Date().toLocaleDateString("en-CA"),
    };

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(expenseData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not save expense.");
      }

      setTitle("");
      setAmount("");
      setCategory("Food");
      setCustomCategory("");
      setShowCategories(false);

      await loadExpenses();
      await loadMonthlySummary(selectedMonth);
      await loadCategorySummary(selectedMonth);

      setMessage("Expense added successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // DELETE EXPENSE
  async function deleteExpense(id) {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/expenses/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not delete expense.");
      }

      await loadExpenses();
      await loadMonthlySummary(selectedMonth);
      await loadCategorySummary(selectedMonth);

      setMessage("Expense deleted successfully!");
    } catch (err) {
      setError(err.message);
    }
  }

  // LOGIN AND REGISTRATION PAGE
  if (!token || page === "login" || page === "register") {
    return (
      <main className="app-container auth-container">
        <header className="header">
          <div>
            <p className="welcome">Welcome to</p>
            <h1>Daily Expenses</h1>
          </div>
          <span className="brand-icon">💰</span>
        </header>

        <section className="add-card auth-card">
          <h3>
            {page === "register" ? "CREATE ACCOUNT" : "USER LOGIN"}
          </h3>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          {page === "register" ? (
            <form onSubmit={handleRegister}>
              <div className="input-box">
                <span>👤</span>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="input-box">
                <span>✉️</span>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-box">
                <span>📱</span>
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </div>

              <div className="input-box">
                <span>🔒</span>
                <input
                  type="password"
                  placeholder="Password (minimum 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength="8"
                  required
                />
              </div>

              <div className="input-box">
                <span>🔒</span>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button className="save-button" type="submit">
                Create Account
              </button>

              <p className="auth-switch">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setPage("login");
                    setError("");
                    setMessage("");
                  }}
                >
                  Login
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin}>
              <div className="input-box">
                <span>👤</span>
                <input
                  type="text"
                  placeholder="Email or Mobile Number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              <div className="input-box">
                <span>🔒</span>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button className="save-button" type="submit">
                Login
              </button>

              <p className="auth-switch">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setPage("register");
                    setError("");
                    setMessage("");
                  }}
                >
                  Register
                </button>
              </p>
            </form>
          )}
        </section>

        <footer>
          <p>Daily Expenses © 2026</p>
          <small>Manage your money, manage your life.</small>
        </footer>
      </main>
    );
  }

  // PROFILE PAGE
  if (page === "profile") {
    return (
      <main className="app-container">
        <header className="header">
          <div>
            <p className="welcome">Account information</p>
            <h1>My Profile</h1>
          </div>

          <button
            type="button"
            className="profile-button"
            onClick={() => setPage("dashboard")}
          >
            ←
          </button>
        </header>

        <section className="add-card profile-card">
          <div className="profile-avatar">👤</div>
          <h3>PERSONAL DETAILS</h3>

          {profile ? (
            <div className="profile-details">
              <p>
                <strong>Name</strong>
                <span>{profile.full_name || profile.fullName || ""}</span>
              </p>
              <p>
                <strong>Email</strong>
                <span>{profile.email || ""}</span>
              </p>
              <p>
                <strong>Mobile</strong>
                <span>{profile.mobile || ""}</span>
              </p>
            </div>
          ) : (
            <p>Loading profile...</p>
          )}

          <button
            className="save-button"
            type="button"
            onClick={() => setPage("dashboard")}
          >
            Back to Dashboard
          </button>

          <button
            className="logout-button"
            type="button"
            onClick={logout}
          >
            Logout
          </button>
        </section>
      </main>
    );
  }

  // CHART DATA: calculated from the selected month's real transactions
  const selectedMonthTransactions = transactions.filter((item) =>
    String(item.expense_date || "").slice(0, 10).startsWith(selectedMonth)
  );

  const weeklySpending = [1, 2, 3, 4, 5].map((week) => {
    const total = selectedMonthTransactions.reduce((sum, item) => {
      const date = String(item.expense_date || "").slice(0, 10);
      const day = Number(date.slice(8, 10));
      return Math.ceil(day / 7) === week ? sum + Number(item.amount || 0) : sum;
    }, 0);
    return { label: `Week ${week}`, total };
  });

  const maxWeeklySpending = Math.max(...weeklySpending.map((item) => item.total), 1);

  const categoryTotal = categorySummary.reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );

  const chartColors = [
    "#5577e8", "#20b8a6", "#f5a623", "#e879a9", "#8b6be8",
    "#38a4dc", "#e47755", "#79b85a", "#d5a43b", "#667085",
    "#3b82f6", "#14b8a6", "#a855f7", "#ef4444"
  ];

  let donutOffset = 0;
  const donutGradient = categorySummary.length
    ? `conic-gradient(${categorySummary.map((item, index) => {
        const percent = categoryTotal > 0
          ? (Number(item.totalAmount || 0) / categoryTotal) * 100
          : 0;
        const start = donutOffset;
        donutOffset += percent;
        return `${chartColors[index % chartColors.length]} ${start}% ${donutOffset}%`;
      }).join(", ")})`
    : "conic-gradient(#e9edf5 0% 100%)";

  // MAIN DASHBOARD
  return (
    <main className="app-container">
      <header className="header">
        <div>
          <p className="welcome">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ""}
          </p>
          <h1>Expenses</h1>
        </div>

        <button
          type="button"
          className="profile-button"
          onClick={loadProfile}
          aria-label="Open profile"
        >
          👤
        </button>
      </header>

      {/* TOTAL SPENDING */}
      <section className="total-card">
        <p className="card-label">TOTAL SPENDING</p>
        <h2>{money(totalExpense)}</h2>
        <div className="transaction-count">
          ↕ {transactions.length} Transactions
        </div>
      </section>

      {/* MONTHLY SUMMARY */}
      <section className="add-card monthly-summary">
        <div className="section-heading">
          <div>
            <p className="welcome">YOUR FINANCIAL OVERVIEW</p>
            <h3>Monthly Spending Summary</h3>
          </div>
          <span className="summary-icon">📊</span>
        </div>

        <label className="category-label" htmlFor="summary-month">
          SELECT MONTH
        </label>

        <div className="input-box">
          <span>📅</span>
          <input
            id="summary-month"
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
          />
        </div>

        <div className="summary-grid">
          <div className="summary-box income-box">
            <span>💰</span>
            <p>Monthly Income</p>
            <h2>{money(monthlyIncome)}</h2>
          </div>

          <div className="summary-box expense-box">
            <span>💸</span>
            <p>Total Expense</p>
            <h2>{money(totalExpense)}</h2>
          </div>
        </div>

        <div className="balance-box">
          <div>
            <p>Remaining Balance</p>
            <h2>{money(monthlyIncome - totalExpense)}</h2>
          </div>
          <span>💵</span>
        </div>

        <form onSubmit={saveMonthlyIncome} className="income-form">
          <label className="category-label">
            SET / UPDATE MONTHLY INCOME
          </label>

          <div className="input-box">
            <span>৳</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter monthly income"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="save-button"
            disabled={savingIncome}
          >
            {savingIncome ? "Saving..." : "Save Monthly Income"}
          </button>
        </form>
      </section>

      {/* SPENDING CHARTS */}
      <section className="charts-grid">
        <div className="add-card chart-card spending-chart-card">
          <div className="section-heading">
            <div>
              <p className="welcome">SPENDING TREND</p>
              <h3>Monthly Spending Chart</h3>
              <p className="chart-subtitle">Expense distribution by week · {selectedMonth}</p>
            </div>
            <span className="summary-icon">📈</span>
          </div>

          {selectedMonthTransactions.length === 0 ? (
            <div className="chart-empty">No spending data for this month yet.</div>
          ) : (
            <div className="weekly-chart" role="img" aria-label="Weekly expense bar chart">
              {weeklySpending.map((item, index) => (
                <div className="weekly-chart-column" key={item.label}>
                  <strong className="bar-value">
                    {item.total > 0 ? money(item.total) : "—"}
                  </strong>
                  <div className="bar-track">
                    <div
                      className={`bar-fill bar-color-${index + 1}`}
                      style={{
                        height: `${item.total > 0 ? Math.max((item.total / maxWeeklySpending) * 100, 5) : 0}%`
                      }}
                    />
                  </div>
                  <span className="bar-label">{item.label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="chart-footnote">
            <span className="chart-dot" />
            <span>Weekly expense total (BDT)</span>
          </div>
        </div>

        <div className="add-card chart-card category-chart-card">
          <div className="section-heading">
            <div>
              <p className="welcome">EXPENSE BREAKDOWN</p>
              <h3>Category Distribution</h3>
              <p className="chart-subtitle">Where your money goes</p>
            </div>
            <span className="summary-icon">🍩</span>
          </div>

          {categorySummary.length === 0 || categoryTotal <= 0 ? (
            <div className="chart-empty">No category data for this month yet.</div>
          ) : (
            <>
              <div className="donut-wrap">
                <div className="donut-chart" style={{ background: donutGradient }}>
                  <div className="donut-hole">
                    <small>Total Expense</small>
                    <strong>{money(categoryTotal)}</strong>
                  </div>
                </div>
              </div>
              <div className="donut-legend">
                {categorySummary.map((item, index) => (
                  <div className="legend-item" key={item.category}>
                    <span
                      className="legend-color"
                      style={{ background: chartColors[index % chartColors.length] }}
                    />
                    <span className="legend-name">{item.category}</span>
                    <strong>{money(item.totalAmount)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CATEGORY REPORT */}
      <section
        className="add-card category-report"
        style={{ marginTop: "22px" }}
      >
        <div className="section-heading">
          <div>
            <p className="welcome">WHERE YOUR MONEY GOES</p>
            <h3>Category-wise Expense Report</h3>
          </div>
          <span className="summary-icon">📂</span>
        </div>

        <p className="report-month">Report for {selectedMonth}</p>

        <button
          type="button"
          className="save-button"
          onClick={() => setShowCategoryReport((current) => !current)}
          style={{ marginTop: "12px" }}
        >
          {showCategoryReport
            ? "HIDE CATEGORY REPORT ▲"
            : "SELECT CATEGORY ▼"}
        </button>

        {showCategoryReport && (
          <div style={{ marginTop: "18px" }}>
            {categorySummary.length === 0 ? (
              <div className="empty-state">
                <span>📊</span>
                <p>No category expenses for this month.</p>
                <small>Add an expense to see your report.</small>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="save-button"
                  onClick={downloadCategoryExcel}
                  style={{ marginBottom: "12px" }}
                >
                  ⬇ Download Excel
                </button>

                <div
                  className="category-report-list"
                  style={{ display: "grid", gap: "18px" }}
                >
                  {categorySummary.map((item) => {
                    const percentage =
                      totalExpense > 0
                        ? Math.min(
                            (Number(item.totalAmount) / totalExpense) * 100,
                            100
                          )
                        : 0;

                    return (
                      <div
                        className="category-report-item"
                        key={item.category}
                        style={{
                          padding: "12px 0",
                          borderBottom: "1px solid #eeeeee",
                        }}
                      >
                        <div
                          className="category-report-top"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            className="category-report-name"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <span>{getCategoryIcon(item.category)}</span>
                            <div>
                              <strong>{item.category}</strong>
                              <small>
                                {item.transactionCount} transaction(s)
                              </small>
                            </div>
                          </div>

                          <strong>{money(item.totalAmount)}</strong>
                        </div>

                        <div
                          className="category-progress-track"
                          style={{
                            height: "8px",
                            background: "#eeeeee",
                            borderRadius: "20px",
                            overflow: "hidden",
                            marginTop: "10px",
                          }}
                        >
                          <div
                            className="category-progress-fill"
                            style={{
                              width: `${percentage}%`,
                              height: "100%",
                              background: "#3678d8",
                              borderRadius: "20px",
                            }}
                          />
                        </div>

                        <p
                          className="category-percentage"
                          style={{
                            fontSize: "12px",
                            color: "#777777",
                            margin: "6px 0 0",
                          }}
                        >
                          {percentage.toFixed(1)}% of monthly expenses
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="category-report-total"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "16px",
                    marginTop: "12px",
                    borderTop: "1px solid #dddddd",
                  }}
                >
                  <span>Total by categories</span>
                  <strong>
                    {money(
                      categorySummary.reduce(
                        (sum, item) =>
                          sum + Number(item.totalAmount || 0),
                        0
                      )
                    )}
                  </strong>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* ERROR AND SUCCESS MESSAGE */}
      {error && (
        <div className="error-message">
          {error}
          <button
            type="button"
            onClick={() => {
              setError("");
              loadExpenses();
              loadMonthlySummary(selectedMonth);
              loadCategorySummary(selectedMonth);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {message && (
        <div className="success-message">{message}</div>
      )}

      {/* ADD EXPENSE */}
      <section className="add-card">
        <h3>ADD TRANSACTION</h3>

        <form onSubmit={addExpense}>
          <div className="input-box">
            <span>✎</span>
            <input
              type="text"
              placeholder="What did you pay for?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="input-box">
            <span>৳</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="category-picker">
            <label className="category-label">
              SELECT CATEGORY
            </label>

            <button
              type="button"
              className="category-select-button"
              onClick={() => setShowCategories(!showCategories)}
            >
              <span>
                {getCategoryIcon(category)}{" "}
                {category === "Others" && customCategory.trim()
                  ? customCategory
                  : category}
              </span>

              <span className="dropdown-arrow">
                {showCategories ? "▲" : "▼"}
              </span>
            </button>

            {showCategories && (
              <div className="category-dropdown">
                {categories.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    className={`dropdown-category ${
                      category === item.name ? "selected" : ""
                    }`}
                    onClick={() => {
                      setCategory(item.name);
                      setShowCategories(false);

                      if (item.name !== "Others") {
                        setCustomCategory("");
                      }
                    }}
                  >
                    <span>
                      {item.icon} {item.name}
                    </span>
                    {category === item.name && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {category === "Others" && (
            <div className="input-box custom-category-input">
              <span>✎</span>
              <input
                type="text"
                placeholder="Enter your category name"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="save-button"
            disabled={saving}
          >
            {saving ? "Saving..." : "+ Save Expense"}
          </button>
        </form>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="recent-section">
        <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "15px",
  }}
>
  <h2>Recent Activity</h2>

  <button
    type="button"
    className="save-button"
    onClick={downloadDateWiseExcel}
    style={{ width: "auto", padding: "10px 16px" }}
  >
    📥 Export Transactions
  </button>
</div>

        {loading ? (
          <div className="empty-state">
            <p>Loading expenses...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <span>🧾</span>
            <p>No expenses yet!</p>
            <small>Add your first expense above.</small>
          </div>
        ) : (
          <div className="transaction-list">
            {transactions.map((item) => (
              <div className="transaction-item" key={item.id}>
                <div className="expense-icon">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="expense-details">
                  <h3>{item.title}</h3>
                  <p>
                    {item.category} · {formatDate(item.expense_date)}
                  </p>
                </div>

                <div className="expense-right">
                  <strong>-{money(item.amount)}</strong>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteExpense(item.id)}
                    aria-label="Delete expense"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        <p>Daily Expenses © 2026</p>
        <small>Manage your money, manage your life.</small>
      </footer>
    </main>
  );
}

export default App;