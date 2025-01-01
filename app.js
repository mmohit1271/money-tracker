const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
    session({
        secret: "money_tracker_secret",
        resave: false,
        saveUninitialized: true,
    })
);

// Initialize SQLite database
const db = new sqlite3.Database("./money_tracker.db", (err) => {
    if (err) console.error("Error opening database:", err);
    console.log("Connected to SQLite database.");
});

// Create tables
db.run(
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`
);

db.run(
    `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        description TEXT,
        amount REAL,
        type TEXT,
        date TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`
);

// Helper to check authentication
function checkAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/login");
    }
    next();
}

// Routes
app.get("/", (req, res) => {
    res.redirect(req.session.userId ? "/transactions" : "/login");
});

// Signup page
app.get("/signup", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="/style.css">
            <title>Signup</title>
        </head>
        <body>
            <div class="container">
                <h1>Signup</h1>
                <form action="/signup" method="POST">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required><br><br>
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required><br><br>
                    <button type="submit" class="btn">Signup</button>
                </form>
                <p>Already have an account? <a href="/login">Login</a></p>
            </div>
        </body>
        </html>
    `);
});

// Signup logic
app.post("/signup", (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
        `INSERT INTO users (username, password) VALUES (?, ?)`,
        [username, hashedPassword],
        function (err) {
            if (err) {
                return res.send(`<p>Error: ${err.message}</p><a href="/signup">Go Back</a>`);
            }
            res.redirect("/login");
        }
    );
});

// Login page
app.get("/login", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="/style.css">
            <title>Login</title>
        </head>
        <body>
            <div class="container">
                <h1>Login</h1>
                <form action="/login" method="POST">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required><br><br>
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required><br><br>
                    <button type="submit" class="btn">Login</button>
                </form>
                <p>Don't have an account? <a href="/signup">Signup</a></p>
            </div>
        </body>
        </html>
    `);
});

// Login logic
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.send(`<p>Invalid username or password.</p><a href="/login">Go Back</a>`);
        }
        req.session.userId = user.id;
        res.redirect("/transactions");
    });
});

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// Transactions page
app.get("/transactions", checkAuth, (req, res) => {
    db.all(
        `SELECT * FROM transactions WHERE user_id = ?`,
        [req.session.userId],
        (err, rows) => {
            if (err) return res.status(500).send("Error fetching transactions.");

            let totalIncome = 0;
            let totalExpense = 0;

            rows.forEach((t) => {
                if (t.type === "Income") totalIncome += t.amount;
                if (t.type === "Expense") totalExpense += t.amount;
            });

            const netBalance = totalIncome - totalExpense;

            const transactionList = rows
                .map(
                    (t) => `
                    <li class="${t.type === "Income" ? "income" : "expense"}">
                        ${t.description} - $${t.amount} (${t.type}) on ${new Date(t.date).toLocaleString()}
                    </li>`
                )
                .join("");

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <link rel="stylesheet" href="/style.css">
                    <title>Transactions</title>
                </head>
                <body>
                    <div class="container">
                        <h1>Your Transactions</h1>
                        <div class="summary">
                            <p>Total Income: <span class="income">$${totalIncome.toFixed(2)}</span></p>
                            <p>Total Expense: <span class="expense">$${totalExpense.toFixed(2)}</span></p>
                            <p>Net Balance: <span class="${netBalance >= 0 ? "income" : "expense"}">
                                $${netBalance.toFixed(2)}</span></p>
                        </div>
                        <ul class="transactions">${transactionList || "<li>No transactions yet.</li>"}</ul>
                        <p><a href="/add-transaction" class="btn">Add Transaction</a></p>
                        <p><a href="/logout" class="btn">Logout</a></p>
                    </div>
                </body>
                </html>
            `);
        }
    );
});

// Add transaction page
app.get("/add-transaction", checkAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="/style.css">
            <title>Add Transaction</title>
        </head>
        <body>
            <div class="container">
                <h1>Add Transaction</h1>
                <form action="/add-transaction" method="POST">
                    <label for="description">Description:</label>
                    <input type="text" id="description" name="description" required><br><br>
                    <label for="amount">Amount:</label>
                    <input type="number" id="amount" name="amount" step="0.01" required><br><br>
                    <label for="type">Type:</label>
                    <select id="type" name="type" required>
                        <option value="Income">Income</option>
                        <option value="Expense">Expense</option>
                    </select><br><br>
                    <button type="submit" class="btn">Add Transaction</button>
                </form>
                <p><a href="/transactions" class="btn">Back</a></p>
            </div>
        </body>
        </html>
    `);
});

// Add transaction logic
app.post("/add-transaction", checkAuth, (req, res) => {
    const { description, amount, type } = req.body;

    db.run(
        `INSERT INTO transactions (user_id, description, amount, type, date) VALUES (?, ?, ?, ?, ?)`,
        [req.session.userId, description, parseFloat(amount), type, new Date()],
        function (err) {
            if (err) return res.status(500).send("Error adding transaction.");
            res.redirect("/transactions");
        }
    );
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Money Tracker app running on port ${PORT}`);
});

