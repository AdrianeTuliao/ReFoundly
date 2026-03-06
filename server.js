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

const cors = require('cors');
app.use(cors({
    origin: 'http://127.0.0.1:5500', 
    credentials: true
}));

app.use(express.json());

/* DATABASE CONNECTION */
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'refoundly_app',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'refoundly_db'
});

/* BLOCKCHAIN SETUP */
let refoundlyContract;
let adminWallet;

try {
    const { ethers } = require('ethers'); 
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:7545';
    
    // Compatibility check for Ethers v5 vs v6
    const provider = ethers.providers 
        ? new ethers.providers.JsonRpcProvider(rpcUrl) 
        : new ethers.JsonRpcProvider(rpcUrl);

    if (process.env.ADMIN_PRIVATE_KEY) {
        adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
        const contractABI = ["function markAsResolved(uint256 _id) public"];
        
        refoundlyContract = new ethers.Contract(
            process.env.CONTRACT_ADDRESS, 
            contractABI, 
            adminWallet
        );
        console.log("✅ Blockchain Service Initialized");
    }
} catch (error) {
    console.error("⚠️ Blockchain Setup Failed:", error.message);
}

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

/* IMPROVED AUDIT LOG HELPER */
function createAuditLog(req, action, details, txHash = null, guestEmail = null) { 
    const userId = req.session.userId || null;
    const adminId = req.session.admin ? req.session.admin.id : null;
    const ip = req.ip;
    
    let identifier = null;
    if (guestEmail) {
        identifier = guestEmail;
    } else if (req.session.admin) {
        identifier = req.session.admin.email;
    }

    const finalDetails = { 
        ...details, 
        identifier: identifier 
    };
 
    const sql = 'INSERT INTO audit_logs (user_id, admin_id, action, details, ip_address, blockchain_tx, wallet_address, gas_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    const values = [
        userId, 
        adminId, 
        action, 
        JSON.stringify(finalDetails), 
        ip, 
        txHash, 
        details.wallet || details.walletAddress || null,
        details.gasUsed || details.gas || null
    ];

    db.execute(sql, values, (err) => {
        if (err) console.error("CRITICAL Audit Logging Error:", err.message);
    });
}

/* MIDDLEWARE */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "'unsafe-eval'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            "img-src": ["'self'", "data:", "blob:"],
            "connect-src": ["'self'", "https://cdn.jsdelivr.net", "http://127.0.0.1:7545"], 
            "script-src-attr": ["'unsafe-inline'"],
        },
    },
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); 

// Prevents clicking "Login" faster than once every 3 seconds.
const burstLimiter = rateLimit({
    windowMs: 3 * 1000, 
    max: 3, 
    message: { success: false, message: "Slow down! Wait 3 seconds." },
    standardHeaders: true,
    legacyHeaders: false,
});

const bruteForceLimiter = rateLimit({
    windowMs: 3 * 60 * 1000, 
    max: 3, 
    handler: (req, res) => {
        // Calculate remaining seconds: (Reset Time - Current Time) / 1000
        const secondsLeft = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
        
        res.status(429).json({ 
            success: false, 
            message: "Too many attempts.", 
            retryAfter: secondsLeft 
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/* SESSION CONFIGURATION */
app.use(session({
    secret: process.env.SESSION_SECRET || 'refoundly_secure_key_2026',
    resave: false,
    saveUninitialized: false, 
    rolling: true,
    cookie: { 
        maxAge: 30 * 60 * 1000, 
        httpOnly: true,  
        secure: false  
    }
}));

/* --- CSRF PROTECTION SETUP --- */
const csrfProtection = csrf({ cookie: true });

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

function requireUser(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        // This block prevents the 302 Redirect and sends a 401 instead
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ success: false, message: "Session expired." });
        }
        res.redirect('/index.html');
    }
}

/* --- ADMIN AUTHENTICATION MIDDLEWARE --- */
function requireAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        next();
    } else {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(403).json({ success: false, message: "Admin access denied." });
        }
        res.redirect('/index.html'); 
    }
}

/* --- API ROUTES --- */
app.post('/api/update-tx', requireUser, csrfProtection, (req, res) => {
    const { itemId, txHash, gasUsed } = req.body;
    const sql = "UPDATE items SET blockchain_tx = ?, gas_used = ? WHERE id = ?";

    db.execute(sql, [txHash, gasUsed, itemId], (err) => {
        if (err) return res.status(500).json({ success: false });

        // CRITICAL: This is what actually writes to the audit_logs table!
        createAuditLog(req, 'BLOCKCHAIN_ANCHOR_SUCCESS', { 
            itemId, 
            txHash, 
            gasUsed 
        }, txHash);

        res.json({ success: true, message: "Logged and Anchored!" });
    });
});



/* USER LOGOUT */
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.get('/user/me', requireUser, (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authorized" });
    const query = "SELECT name, email, contact_number, dob FROM users WHERE id = ?";
    db.query(query, [req.session.userId], (err, results) => {
        if (err || results.length === 0) return res.status(500).send(err);
        res.json(results[0]);
    });
});

const nodemailer = require('nodemailer');

// Gmail Sender
const transporter = nodemailer.createTransport({
    pool: true, 
    host: "smtp.gmail.com",
    port: 587,
    secure: false, 
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Prevent timeouts
    maxConnections: 5,
    maxMessages: 100
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Transporter connection error:", error);
  } else {
    console.log("🚀 Server is ready to take our messages");
  }
});

/* --- REAL GMAIL OTP FOR REGISTRATION --- */
app.post('/register', async (req, res) => {
    const { name, username, email, password, contact_number, dob } = req.body; 
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        req.session.regData = { name, username, email, password: hashedPassword, contact_number, dob };
        req.session.regOTP = otp;

        const mailOptions = {
            from: `"ReFoundly" <${process.env.EMAIL_USER}>`, 
            to: email,
            subject: 'Verify your email', 
            html: `
                <div style="font-family: 'Google Sans', Roboto, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #3c4043; font-size: 24px; font-weight: 400; margin-top: 0;">Verify your email</h1>
                    </div>
                    
                    <div style="color: #3c4043; font-size: 14px; line-height: 1.5; margin-bottom: 25px;">
                        ReFoundly received a request to use <b>${email}</b> as your email for ReFoundly Account <b>${username}</b>.
                        <br><br>
                        Use this code to finish setting up this recovery email:
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 40px; letter-spacing: 5px; color: #202124;">${otp}</span>
                    </div>

                    <div style="color: #70757a; font-size: 12px; margin-bottom: 20px;">
                        This code will expire in 24 hours.
                    </div>

                    <div style="color: #70757a; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                        If you don't recognize <b>${process.env.EMAIL_USER}</b>, you can safely ignore this email.
                    </div>
                </div>`
        };

        transporter.sendMail(mailOptions).catch(err => console.error("Registration Mail Error:", err));
        res.json({ success: true, otpSent: true, message: "Verification code sent!" }); 

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
});

/* --- OPTIMIZED GMAIL OTP FOR LOGIN (WITH TRUSTED DEVICE LOGIC) --- */
app.post('/login', burstLimiter, bruteForceLimiter, (req, res) => {
    const { email, password, isTrustedDevice } = req.body;

    db.execute('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: 'User not found' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.json({ success: false, message: 'Wrong password' });

        if (isTrustedDevice === true) {
            req.session.userId = user.id; 
            return res.json({ 
                success: true, 
                mfaRequired: false, 
                message: "Welcome back! Login successful." 
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        req.session.tempOTP = otp;
        req.session.tempUserId = user.id;

        const mailOptions = {
            from: `"ReFoundly" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Login Security Code',
            html: `
                <div style="font-family: 'Google Sans', Roboto, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #3c4043; font-size: 24px; font-weight: 400; margin-top: 0;">Login Verification</h1>
                    </div>
                    
                    <div style="color: #3c4043; font-size: 14px; line-height: 1.5; margin-bottom: 25px;">
                        A login request was made for your account. Use this code to finish logging in:
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 40px; letter-spacing: 5px; color: #7aa340; font-weight: bold;">${otp}</span>
                    </div>

                    <div style="color: #70757a; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                        This code is highly sensitive. If you did not request this, please change your password immediately.
                    </div>
                </div>`
        };

        transporter.sendMail(mailOptions).catch(mailErr => console.error("Background Mail Error:", mailErr));

        return res.json({ 
            success: true, 
            mfaRequired: true, 
            message: "OTP sent! Please check your inbox." 
        });
    });
});

/* --- FORGOT PASSWORD: SEND OTP --- */
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;

    db.execute('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false, message: "If that email exists, an OTP has been sent." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        req.session.resetOTP = otp;
        req.session.resetEmail = email;

        const mailOptions = {
            from: `"ReFoundly Verification" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Reset your ReFoundly password',
            html: `
                <div style="font-family: 'Google Sans', Roboto, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #3c4043; font-size: 24px; font-weight: 400; margin-top: 0;">Password Reset</h1>
                    </div>
                    <div style="color: #3c4043; font-size: 14px; line-height: 1.5; margin-bottom: 25px;">
                        We received a request to reset your password. Use the code below to proceed:
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 40px; letter-spacing: 5px; color: #7aa340; font-weight: bold;">${otp}</span>
                    </div>
                    <div style="color: #70757a; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                        This code is highly sensitive. If you did not request this, please change your password immediately.
                    </div>
                </div>`
        };

        transporter.sendMail(mailOptions).catch(err => console.error("Reset Mail Error:", err));
        res.json({ success: true, message: "OTP sent to your email." });
    });
});

/* --- FORGOT PASSWORD: VERIFY & UPDATE --- */
app.post('/api/reset-password', async (req, res) => {
    const { otp, newPassword } = req.body;

    if (otp === req.session.resetOTP) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const email = req.session.resetEmail;

            db.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (err) => {
                if (err) return res.status(500).json({ success: false });

                // Clear reset session
                delete req.session.resetOTP;
                delete req.session.resetEmail;

                res.json({ success: true, message: "Password updated successfully!" });
            });
        } catch (err) {
            res.status(500).json({ success: false });
        }
    } else {
        res.json({ success: false, message: "Invalid OTP code." });
    }
});

app.post('/verify-registration', (req, res) => {
    const { otp } = req.body;

    if (otp === req.session.regOTP) {
        const { name, username, email, password, contact_number, dob } = req.session.regData;
        
        const sql = "INSERT INTO users (name, username, email, password, contact_number, dob) VALUES (?, ?, ?, ?, ?, ?)";
        db.execute(sql, [name, username, email, password, contact_number, dob], (err) => {
            if (err) return res.status(500).json({ success: false, message: "Database error" });
            
            delete req.session.regOTP;
            delete req.session.regData;
            
            res.json({ success: true });
        });
    } else {
        res.status(400).json({ success: false, message: "Invalid OTP code" });
    }
});

app.post('/verify-otp', burstLimiter, (req, res) => {
    if (req.body.otp === req.session.tempOTP) {
        req.session.userId = req.session.tempUserId; 
        res.json({ success: true });
    } else { res.json({ success: false }); }
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

/* ITEM REPORTING & HISTORY - SECURE VERSION */
app.post('/submit-report', requireUser, upload.single('itemImage'), (req, res) => {
    // EXTRACTION (Was missing in your snippet)
    const userId = req.session.userId;
    const { 
        itemName, category, brand, dateLost, timeLost, 
        location, description, reportType, firstName, 
        lastName, phoneNumber, email, txHash, gasUsed, walletAddress 
    } = req.body;

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // DATABASE EXECUTION
    const sql = `INSERT INTO items (
                    user_id, item_name, category, brand, incident_date, 
                    incident_time, location, image_path, description, 
                    report_type, contact_firstname, contact_lastname, 
                    contact_phone, contact_email, status, blockchain_tx, gas_used
                ) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Approval', ?, ?)`;
    
    db.execute(sql, [
        userId, itemName, category, brand, dateLost, timeLost, location, 
        imagePath, description, reportType, firstName, lastName, 
        phoneNumber, email, txHash || null, gasUsed || null
    ], (err, results) => { 
        if (err) {
            console.error("DB Error:", err);
            return res.status(500).json({ success: false, message: "Database Error" });
        }

        const newReportId = results.insertId;

        // AUDIT LOGGING
        createAuditLog(req, 'ITEM_REPORTED', { 
            item: itemName, 
            itemId: newReportId,
            type: reportType,
            txHash: txHash || null, 
            wallet: walletAddress || null,
            gasUsed: gasUsed || 0 
        }); 

        // RESPONSE
        res.status(200).json({ 
            success: true, 
            itemId: newReportId, 
            message: "Database record created" 
        });
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

// Mask contact info for privacy optimization
app.get('/api/items/published', (req, res) => {
    const sql = `SELECT * FROM items WHERE status = 'Published' ORDER BY created_at DESC LIMIT 12`;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const maskedResults = results.map(item => {
            return {
                ...item,

                contact_phone: item.contact_phone 
                    ? item.contact_phone.replace(/(\d{4})(\d+)(\d{3})/, "$1-****-$3") 
                    : "N/A",
                contact_email: item.contact_email 
                    ? item.contact_email.replace(/(.{2})(.*)(@.*)/, "$1**$3") 
                    : "N/A"
            };
        });

        res.json(maskedResults);
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

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Add this to your server.js
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
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

app.post('/api/admin/update-status', requireAdmin, async (req, res) => {
    const { itemId, newStatus } = req.body;
    let txHash = null;

    console.log(`[Admin Action] Updating Item ${itemId} to ${newStatus}`);

    try {
        // 1. BLOCKCHAIN LOGIC (Only if contract is initialized and status is Published/Resolved)
        if (refoundlyContract && (newStatus === 'Published' || newStatus === 'Resolved')) {
            try {
                console.log(`[Blockchain] Sending transaction for ID: ${itemId}...`);
                const tx = await refoundlyContract.markAsResolved(itemId);
                const receipt = await tx.wait(); 
                txHash = receipt.hash || receipt.transactionHash;
                console.log(`✅ Blockchain Success: ${txHash}`);
            } catch (bcErr) {
                console.error("⚠️ Blockchain Transaction Failed (ID mismatch?), continuing with DB update:", bcErr.message);
            }
        }

        // 2. DATABASE LOGIC (Always runs)
        const updateSql = "UPDATE items SET status = ? WHERE id = ?";
        db.query(updateSql, [newStatus, itemId], (err) => {
            if (err) {
                console.error("❌ Database Update Error:", err);
                return res.status(500).json({ success: false, message: "Database Error" });
            }

            // 3. AUDIT LOGGING
            createAuditLog(req, `ADMIN_STATUS_${newStatus.toUpperCase()}`, { 
                itemId, 
                status: newStatus,
                wallet: adminWallet ? adminWallet.address : "Server-Only"
            }, txHash); 

            res.json({ 
                success: true, 
                message: txHash ? "Status updated on Chain & DB" : "Status updated in DB (Blockchain skipped/failed)",
                txHash: txHash 
            });
        });

    } catch (criticalErr) {
        console.error("❌ Critical Route Error:", criticalErr);
        res.status(500).json({ success: false, message: "Server encountered a critical error" });
    }
});

app.get('/api/admin/audit_logs', requireAdmin, (req, res) => {
    const sql = `
        SELECT 
            a.*, 
            u.name as user_name, 
            ad.email as admin_email,
            JSON_UNQUOTE(JSON_EXTRACT(a.details, '$.identifier')) as guest_identifier
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
app.get('/dashboard.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'dashboard.html')));
app.get('/user_acc.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'user_acc.html')));
app.get('/AdHome.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'Admin', 'AdHome.html')));
app.get('/AdReport.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'Admin', 'AdReport.html')));

app.use(express.static(path.join(__dirname, 'User')));
app.use(express.static(path.join(__dirname, 'Admin')));
app.use('/uploads', express.static(path.join(__dirname, 'User', 'uploads')));

app.get('/api/admin/stats', requireAdmin, (req, res) => {
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

app.get('/api/admin/recent-activity', requireAdmin, (req, res) => {
    const sql = `SELECT id, item_name, category, status, report_type, brand, incident_time,
                 DATE_FORMAT(incident_date, '%b. %d, %Y') as formattedDate 
                 FROM items 
                 ORDER BY created_at DESC LIMIT 5`;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/admin/analytics', requireAdmin, (req, res) => {
    const { category, range } = req.query;

    let conditions = ["1=1"]; 
    let params = [];

    if (category && category !== 'all') {
        conditions.push("category = ?");
        params.push(category);
    }

    if (range) {
        conditions.push("created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)");
        params.push(parseInt(range));
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // 1. Monthly Trends (Success Rate logic)
    const monthlySql = `
        SELECT DATE_FORMAT(incident_date, '%M') as month, 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'Denied' THEN 1 ELSE 0 END) as denied,
        SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) as published
        FROM items 
        ${whereClause}
        GROUP BY MONTH(incident_date), YEAR(incident_date)
        ORDER BY MIN(incident_date) ASC;`;

    // 2. "ANO" - Category Distribution
    const categorySql = `
        SELECT category, COUNT(*) as count 
        FROM items 
        ${whereClause}
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 5;`;

    // 3. "SAAN" - Top Locations (NEW!)
    const locationSql = `
        SELECT location, COUNT(*) as count 
        FROM items 
        ${whereClause}
        GROUP BY location 
        ORDER BY count DESC 
        LIMIT 5;`;

    db.query(monthlySql, params, (err, monthlyResults) => {
        if (err) return res.status(500).json({ error: "Monthly query failed" });
        
        db.query(categorySql, params, (err2, categoryResults) => {
            if (err2) return res.status(500).json({ error: "Category query failed" });

            db.query(locationSql, params, (err3, locationResults) => {
                if (err3) return res.status(500).json({ error: "Location query failed" });

                // Send all three sets of data to the frontend
                res.json({
                    monthly: monthlyResults,
                    categories: categoryResults,
                    locations: locationResults
                });
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

// Add Admin account
app.post('/api/admin-users/add', requireAdmin, csrfProtection, async (req, res) => {
    const { name, email, contact_number, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Target the 'admins' table specifically
        const sql = 'INSERT INTO admins (name, email, password, contact_number) VALUES (?, ?, ?, ?)';
        const values = [name, email, hashedPassword, contact_number];

        db.execute(sql, values, (err, result) => {
            if (err) {
                console.error("Database Error:", err.message);
                return res.json({ success: false, message: "Email may already exist." });
            }
            res.json({ success: true, message: "Admin account created!" });
        });
    } catch (error) {
        console.error("Hash Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is actually listening on port ${PORT}`);
});