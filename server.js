require('dotenv').config(); 
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const adminUsersRoute = require("./Routes/adminUsers.js");

const app = express();

/* DATABASE CONNECTION */
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'refoundly_app',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'refoundly_db'
});

const storage = multer.diskStorage({
    destination: './User/uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to ReFoundly Database');
});

/* AUDIT LOG HELPER */
function createAuditLog(req, action, details) {
    const userId = req.session.userId || null;
    const adminId = req.session.admin ? req.session.admin.id : null;
    const ip = req.ip;

    const sql = 'INSERT INTO audit_logs (user_id, admin_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)';
    db.execute(sql, [userId, adminId, action, JSON.stringify(details), ip], (err) => {
        if (err) console.error("Audit Logging Error:", err);
    });
}


/* MIDDLEWARE */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"], 
            "script-src": ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "blob:"],
            "connect-src": ["'self'", "https://cdn.jsdelivr.net"] 
        },
    },
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); 

/* LIMIT LOG IN ATTEMPTS */
const loginLimiter = rateLimit({
    windowMs: 5 * 1000, 
    max: 5, 
    message: { success: false, message: "Too many attempts. Try again in 5 Seconds." }
});


/* SESSION CONFIGURATION */
app.use(session({
    secret: process.env.SESSION_SECRET || 'refoundly_secure_key_2026',
    resave: false,
    saveUninitialized: false, 
    cookie: { 
        maxAge: 15 * 60 * 1000, 
        httpOnly: true,  
        secure: false  
    }
}));

/* CSRF PROTECTION SETUP */
const csrfProtection = csrf({ cookie: true });

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

/* MFA / OTP LOGIC */
app.post('/verify-otp', (req, res) => {
    const { otp } = req.body;
    if (otp === req.session.tempOTP) {
        req.session.userId = req.session.tempUserId;
        delete req.session.tempOTP;
        return res.json({ success: true });
    }
    res.json({ success: false, message: "Invalid OTP" });
});

/* USER AUTHENTICATION */
app.post('/login', loginLimiter, (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) return res.status(400).json({ success: false, message: "Missing fields" });

    const query = 'SELECT * FROM users WHERE email = ?';
    db.execute(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database Error' });
        if (results.length === 0) return res.json({ success: false, message: 'Invalid Credentials' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) return res.json({ success: false, message: 'Invalid Credentials' });

        // MFA TRIGGER: Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        req.session.tempOTP = otp;
        req.session.tempUserId = user.id;

        console.log(`[MFA DEBUG] OTP for ${email}: ${otp}`); 
        res.json({ success: true, mfaRequired: true, message: "OTP sent to your email (check console)" });
    });
});

// User Registration with Strong Password Check
app.post('/register', async (req, res) => {
    const { name, email, password, contact_number, dob } = req.body;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            success: false, 
            message: "Password too weak! Must include uppercase, lowercase, number, and special character." 
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (name, email, password, contact_number, dob) VALUES (?, ?, ?, ?, ?)';
        db.execute(sql, [name, email, hashedPassword, contact_number, dob], (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Email already exists' });
            res.json({ success: true, message: 'ReFoundly account created securely!' });
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

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

/* USER LOGOUT */
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

/* USER REGISTRATION */
app.post('/register', async (req, res) => {
    const { name, email, password, contact_number, dob } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (name, email, password, contact_number, dob) VALUES (?, ?, ?, ?, ?)';
        
        db.execute(sql, [name, email, hashedPassword, contact_number, dob], (err, result) => {
            if (err) {
                console.error("Reg Error:", err);
                return res.status(500).json({ success: false, message: 'Email already exists or DB error' });
            }
            res.json({ success: true, message: 'Account created securely!' });
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Hashing Error' });
    }
});

/* ADMIN AUTHENTICATION */
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

/* ADMIN LOGOUT */
app.post('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false })
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

/* ITEM REPORTING & HISTORY */
app.post('/submit-report', requireUser, upload.single('itemImage'), (req, res) => {
    const { itemName, category, brand, dateLost, timeLost, location, description, reportType, firstName, lastName, phoneNumber, email } = req.body;

    if (!itemName || !category || !location || !reportType) {
        return res.status(400).send("<script>alert('Error: Required fields are missing!'); window.history.back();</script>");
    }
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const userId = req.session.userId;

    const sql = `INSERT INTO items (user_id, item_name, category, brand, incident_date, incident_time, location, image_path, description, report_type, contact_firstname, contact_lastname, contact_phone, contact_email, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Approval')`;
    
    db.execute(sql, [userId, itemName, category, brand, dateLost, timeLost, location, imagePath, description, reportType, firstName, lastName, phoneNumber, email], (err) => {
        if (err) return res.status(500).send("Database Error");
        createAuditLog(req, 'ITEM_REPORTED', { item: itemName, type: reportType }); 

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
    const sql = `SELECT id, item_name, category, report_type, image_path, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate 
                 FROM items WHERE status = 'Published' ORDER BY created_at DESC LIMIT 12`;
    /* This route fetches only the necessary fields for the homepage and dashboard listings, which improves performance by reducing the amount of data sent to the client. The frontend can then make a separate API call to fetch full details when a user clicks on an item. */
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

//* ADMIN USER MANAGEMENT ROUTES */
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

        // --- ADD THIS LOG TRIGGER ---
        createAuditLog(req, 'ADMIN_STATUS_UPDATE', { itemId: itemId, status: newStatus });

        res.json({ success: true });
    });
});

app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
    const sql = `
        SELECT a.*, u.name as user_name, ad.email as admin_email 
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN admins ad ON a.admin_id = ad.id
        ORDER BY a.created_at DESC LIMIT 50`;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Audit fetch failed" });
        res.json(results);
    });
});

/* STATIC FILES & DASHBOARD PAGES */
app.use(express.static(path.join(__dirname, 'User')));
app.use(express.static(path.join(__dirname, 'Admin')));

app.get('/dashboard.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'dashboard.html')));
app.get('/user_acc.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'user_acc.html')));
app.get('/AdHome.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'Admin', 'AdHome.html')));


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

app.get('/api/admin/recent-activity', (req, res) => {
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

// --- FETCH SINGLE ITEM DETAILS ---
app.get('/api/items/:id', (req, res) => {
    const itemId = req.params.id;

    // We use the same formatting as your other routes for consistency
    const sql = `
        SELECT *, 
        DATE_FORMAT(incident_date, '%b %d, %Y') as incident_date, 
        TIME_FORMAT(incident_time, '%h:%i %p') as incident_time 
        FROM items 
        WHERE id = ?`;

    db.query(sql, [itemId], (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: "Internal Server Error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Item not found" });
        }

        res.json(results[0]);
    });
});


const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));