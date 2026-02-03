const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const multer = require('multer');
const adminUsersRoute = require("./Routes/adminUsers.js");

const app = express();

/**
 * CONFIGURATIONS
 */
const storage = multer.diskStorage({
    destination: './User/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'refoundly_db'
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to refoundly_db');
});

/**
 * MIDDLEWARE
 */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'refoundly_secret_key',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAdmin(req, res, next) {
    if (!req.session.admin) return res.redirect('/AdLogin.html');
    next();
}

function requireUser(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect('/index.html');
    }
}

/**
 * USER AUTHENTICATION
 */
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ?';
    db.execute(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Internal Server Error' });
        if (results.length === 0) return res.json({ success: false, message: 'Invalid Email or Password' });

        const user = results[0];
        try {
            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.json({ success: false, message: 'Invalid Email or Password' });
            req.session.userId = user.id;
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/user/me', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authorized" });
    const query = "SELECT name, email, contact_number, dob FROM users WHERE id = ?";
    db.query(query, [req.session.userId], (err, results) => {
        if (err || results.length === 0) return res.status(500).send(err);
        res.json(results[0]);
    });
});

/**
 * ADMIN AUTHENTICATION
 */
app.post('/admin/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM admins WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error' });
        if (results.length === 0) return res.json({ success: false, message: 'Invalid Email or Password' });

        const admin = results[0];
        try {
            const match = await bcrypt.compare(password, admin.password);
            if (!match) return res.json({ success: false, message: 'Invalid Email or Password' });

            req.session.admin = { id: admin.id, email: admin.email };
            req.session.save((err) => {
                if (err) return res.status(500).json({ success: false });
                res.json({ success: true });
            });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });
});

app.post('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/admin/me', requireAdmin, (req, res) => {
    const sql = 'SELECT id, name, email, contact_number FROM admins WHERE id = ?';
    db.query(sql, [req.session.admin.id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(results[0]);
    });
});

/**
 * ITEM REPORTING & HISTORY
 */
app.post('/submit-report', requireUser, upload.single('itemImage'), (req, res) => {
    const { itemName, category, brand, dateLost, timeLost, location, description, reportType, firstName, lastName, phoneNumber, email } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const userId = req.session.userId;

    const sql = `INSERT INTO items (user_id, item_name, category, brand, incident_date, incident_time, location, image_path, description, report_type, contact_firstname, contact_lastname, contact_phone, contact_email, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Approval')`;

    db.execute(sql, [userId, itemName, category, brand, dateLost, timeLost, location, imagePath, description, reportType, firstName, lastName, phoneNumber, email], (err) => {
        if (err) return res.status(500).send("Database Error");
        res.send("<script>alert('Report Submitted!'); window.location='/dashboard.html';</script>");
    });
});

app.get('/api/user-history', requireUser, (req, res) => {
    const sql = `SELECT *, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate, TIME_FORMAT(incident_time, '%h:%i %p') as formattedTime 
                 FROM items WHERE user_id = ? ORDER BY created_at DESC`;
    db.query(sql, [req.session.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

/**
 * PUBLIC & DASHBOARD API
 */
app.get('/api/items/published', (req, res) => {
    const sql = `SELECT id, item_name, category, image_path, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate 
                 FROM items WHERE status = 'Published' ORDER BY created_at DESC LIMIT 12`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/items/lost', (req, res) => {
    const sql = `SELECT *, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate, TIME_FORMAT(incident_time, '%h:%i %p') as formattedTime
                 FROM items WHERE status = 'Published' AND report_type = 'Lost' ORDER BY created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/items/found', (req, res) => {
    const sql = `SELECT *, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate, TIME_FORMAT(incident_time, '%h:%i %p') as formattedTime
                 FROM items WHERE status = 'Published' AND report_type = 'Found' ORDER BY created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

/**
 * ADMIN MANAGEMENT API
 */
app.use("/api/admin-users", adminUsersRoute);

app.get('/api/admin/items', requireAdmin, (req, res) => {
    const sql = `SELECT *, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate FROM items ORDER BY id DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

app.post('/api/admin/update-status', requireAdmin, (req, res) => {
    const { itemId, newStatus } = req.body;
    const sql = "UPDATE items SET status = ? WHERE id = ?";
    db.execute(sql, [newStatus, itemId], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

/**
 * STATIC FILE SERVING
 */
app.use(express.static(path.join(__dirname, 'User')));
app.use(express.static(path.join(__dirname, 'Admin')));

app.get('/dashboard.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'dashboard.html')));
app.get('/user_acc.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'user_acc.html')));
app.get('/AdHome.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'Admin', 'AdHome.html')));

// --- ADMIN DASHBOARD: GET COUNTS ---
app.get('/api/admin/stats', (req, res) => {
    const sql = `
        SELECT 
            SUM(CASE WHEN report_type = 'Lost' THEN 1 ELSE 0 END) as totalLost,
            SUM(CASE WHEN report_type = 'Found' THEN 1 ELSE 0 END) as totalFound,
            SUM(CASE WHEN status = 'Pending Approval' THEN 1 ELSE 0 END) as totalPending,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as totalClaimed,
            COUNT(*) as totalItems
        FROM items`;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

// --- ADMIN DASHBOARD: RECENT ACTIVITY (FIXED) ---
app.get('/api/admin/recent-activity', (req, res) => {
    // We now fetch incident_date and incident_time instead of created_at
    // We also include 'brand' so you can display it in the table
    const sql = `SELECT id, item_name, category, status, report_type, brand, incident_time,
                 DATE_FORMAT(incident_date, '%b. %d, %Y') as formattedDate 
                 FROM items 
                 ORDER BY created_at DESC LIMIT 5`;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/admin/analytics', (req, res) => {
    // Query 1: Monthly Trends
    const monthlySql = `
        SELECT DATE_FORMAT(incident_date, '%M') as month, COUNT(*) as total,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved
        FROM items 
        GROUP BY MONTH(incident_date) 
        ORDER BY MONTH(incident_date) ASC;`;

    // Query 2: Category Distribution
    const categorySql = `
        SELECT category, COUNT(*) as count 
        FROM items 
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 5;`;

    db.query(monthlySql, (err, monthlyResults) => {
        if (err) return res.status(500).json(err);
        
        db.query(categorySql, (err, categoryResults) => {
            if (err) return res.status(500).json(err);
            
            res.json({
                monthly: monthlyResults,
                categories: categoryResults
            });
        });
    });
});
/**
 * SERVER STARTUP
 */
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));