const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');

const app = express();

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'refoundly_secret_key',
    resave: false,
    saveUninitialized: false
}));

// --- Database Connection ---
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

// --- Static Folders ---
app.use(express.static(path.join(__dirname, 'User')));
app.use(express.static(path.join(__dirname, 'Admin')));

// --- Auth Middleware ---
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

// --- USER LOGIN ---
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
            console.error(err);
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    });
});

// --- CURRENT USER PROFILE ---
app.get('/user/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: "Not authorized" });
    }
    const query = "SELECT full_name, email, contact_number, dob FROM users WHERE id = ?";
    
    db.query(query, [req.session.userId], (err, results) => {
        if (err || results.length === 0) return res.status(500).send(err);
        res.json(results[0]); 
    });
});

app.get('/dashboard.html', requireUser, (req, res) => {
    res.sendFile(path.join(__dirname, 'User', 'dashboard.html'));
});

// --- ADMIN ROUTES ---
// Login
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
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });
});

// Serve User Account page (only for logged-in users)
app.get('/user_acc.html', requireUser, (req, res) => {
    res.sendFile(path.join(__dirname, 'User', 'user_acc.html'));
});



// Admin profile
app.get('/admin/me', requireAdmin, (req, res) => {
    const sql = 'SELECT id, name, email, contact_number FROM admins WHERE id = ?';
    db.query(sql, [req.session.admin.id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error' });
        res.json(results[0]);
    });
});

// Admin logout
app.post('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// Admin dashboard
app.get('/AdHome.html', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin', 'AdHome.html'));
});

// User logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});


// --- Server Startup ---
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
