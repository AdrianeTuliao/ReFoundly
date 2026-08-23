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

/* --- CLEANED AUDIT LOG HELPER --- */
function createAuditLog(req, action, details, guestEmail = null) { 
    const userId = req.session.userId || null;
    const adminId = req.session.admin ? req.session.admin.id : null;
    const ip = req.ip;
    
    let identifier = "Unknown";

    if (guestEmail) {
        identifier = guestEmail;
    } else if (req.session.admin) {
        identifier = req.session.admin.email;
    } else if (req.session.userId) {
        identifier = `User ID: ${req.session.userId}`;
    }

    const finalDetails = { 
        ...details, 
        identifier: identifier 
    };

    const sql = 'INSERT INTO audit_logs (user_id, admin_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)';
    const values = [userId, adminId, action, JSON.stringify(finalDetails), ip];

    db.execute(sql, values, (err) => {
        if (err) console.error("Audit Logging Error:", err.message);
    });
}

/* MIDDLEWARE */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "'unsafe-eval'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://kit.fontawesome.com"],
            "img-src": ["'self'", "data:", "blob:", "*"], 
            "connect-src": [
                "'self'", 
                "https://cdn.jsdelivr.net"
            ], 
            "script-src-attr": ["'unsafe-inline'"],
            "upgrade-insecure-requests": null,
        },
    },
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); 
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

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
        const resetTime = req.rateLimit.resetTime;
        const secondsLeft = resetTime ? Math.ceil((new Date(resetTime) - Date.now()) / 1000) : 180;
        
        const targetEmail = req.body.email || "Anonymous";
        createAuditLog(req, 'SECURITY_BRUTE_FORCE_BLOCK', { 
            reason: 'Max attempts exceeded',
            retryAfter: `${secondsLeft}s` 
        }, targetEmail); 

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
    resave: true,
    saveUninitialized: false, 
    rolling: true,
    name: 'refound.sid',
    cookie: { 
        maxAge: 50 * 60 * 1000, 
        httpOnly: true,  
        secure: false,  
        sameSite: 'lax',
        path: '/'
    }
}));

/* --- CSRF PROTECTION SETUP --- */
const csrfProtection = csrf({ cookie: true });

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

function requireUser(req, res, next) {
    if (req.session && req.session.userId) {
        // 🟢 Binago: 'status' column lang ang kukunin mula sa DB
        db.query('SELECT status FROM users WHERE id = ?', [req.session.userId], (err, results) => {
            if (err || results.length === 0) {
                req.session.destroy();
                return res.status(401).json({ success: false, message: "Session invalid." });
            }

            const user = results[0];
            const userStatus = user.status ? user.status.toString().toLowerCase() : '';
            const isSuspended = userStatus === 'suspended' || userStatus === 'banned';

            if (isSuspended) {
                req.session.destroy(); // I-kickout agad kapag suspended
                if (req.headers.accept && req.headers.accept.includes('application/json')) {
                    return res.status(403).json({ success: false, message: "Your account has been suspended." });
                }
                return res.redirect('/index.html');
            }

            next();
        });
    } else {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ success: false, message: "Session expired." });
        }
        res.redirect('/index.html');
    }
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        // 🟢 Binago: 'status' column lang ang kukunin para sa Admin
        db.query('SELECT status FROM admins WHERE id = ?', [req.session.admin.id], (err, results) => {
            if (err || results.length === 0) {
                req.session.destroy();
                return res.status(401).json({ success: false, message: "Admin session invalid." });
            }

            const admin = results[0];
            const adminStatus = admin.status ? admin.status.toString().toLowerCase() : '';
            const isSuspended = adminStatus === 'suspended' || adminStatus === 'banned';

            if (isSuspended) {
                req.session.destroy(); // Kickout suspended Admin
                if (req.originalUrl.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
                    return res.status(403).json({ success: false, message: "Admin account is suspended." });
                }
                return res.redirect('/index.html');
            }

            return next();
        });
    } else {
        if (req.originalUrl.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.status(401).json({ success: false, message: "Admin session expired or access denied." });
        }
        res.redirect('/index.html');
    }
}

/* --- API ROUTES --- */
app.get('/api/get-session-info', (req, res) => {
    if (req.session.userId) {
        res.json({ success: true, userId: req.session.userId });
    } else {
        res.status(401).json({ success: false, message: "No active session" });
    }
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

/* --- OPTIMIZED GMAIL OTP FOR LOGIN --- */
app.post('/login', burstLimiter, bruteForceLimiter, (req, res) => {
    const { email, password, isTrustedDevice } = req.body;

    db.execute('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) {
            createAuditLog(req, 'SECURITY_LOGIN_FAILURE', { reason: 'User not found' }, email);
            return res.json({ success: false, message: 'User not found' });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
const userStatus = user.status ? user.status.toString().toLowerCase() : '';
        const isSuspended = userStatus === 'suspended' || userStatus === 'banned' || user.is_suspended === 1;

        if (isSuspended) {
            createAuditLog(req, 'SECURITY_LOGIN_FAILURE', { reason: 'Account suspended' }, email);
            
            // 🟢 I-parse ang suspend_reasons mula sa DB
            let parsedReasons = [];
            try {
                parsedReasons = user.suspend_reasons ? JSON.parse(user.suspend_reasons) : [];
            } catch (e) {
                parsedReasons = user.suspend_reasons ? [user.suspend_reasons] : [];
            }

            // 🟢 IPASA ANG suspend_reasons AT suspended_until SA FRONTEND
            return res.json({ 
                success: false, 
                isSuspended: true,
                message: 'Your account is suspended. Please contact support.',
                suspend_reasons: parsedReasons,
                suspended_until: user.suspended_until 
            });
        }
        
        if (!match) {
            createAuditLog(req, 'SECURITY_LOGIN_FAILURE', { reason: 'Wrong password' }, email);
            return res.json({ success: false, message: 'Wrong password' });
        }

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

        db.execute('SELECT status FROM users WHERE id = ?', [req.session.tempUserId], (err, results) => {
            if (results && results.length > 0) {
                const u = results[0];
                const userStatus = u.status ? u.status.toString().toLowerCase() : '';
                const isSuspended = userStatus === 'suspended' || userStatus === 'banned';

                if (isSuspended) {
                    return res.json({ success: false, message: "Your account is suspended. Please contact support." });
                }
            }

            req.session.userId = req.session.tempUserId; 
            res.json({ success: true });
        });

    } else { 
        res.json({ success: false, message: "Invalid OTP" }); 
    }
});

/* ADMIN AUTHENTICATION */
app.post('/admin/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM admins WHERE email = ?';

    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error' });

        // 1. KUNG WALANG HINAHANAP NA ADMIN EMAIL
        if (results.length === 0) {
            createAuditLog(req, 'SECURITY_ADMIN_LOGIN_FAILURE', { reason: 'User not found' }, email);
            return res.json({ success: false, message: 'Invalid Email or Password' });
        }

        const admin = results[0];

        // 2. KUNG SUSPENDED ANG ACCOUNT
        const adminStatus = admin.status ? admin.status.toString().toLowerCase() : '';
        const isSuspended = adminStatus === 'suspended' || adminStatus === 'banned';

        if (isSuspended) {
            createAuditLog(req, 'SECURITY_ADMIN_LOGIN_FAILURE', { reason: 'Admin account suspended' }, email);
            
            let parsedReasons = [];
            try {
                parsedReasons = admin.suspend_reasons ? JSON.parse(admin.suspend_reasons) : [];
            } catch (e) {
                parsedReasons = admin.suspend_reasons ? [admin.suspend_reasons] : [];
            }

            return res.json({ 
                success: false, 
                isSuspended: true,
                message: 'Your admin account is suspended.',
                suspend_reasons: parsedReasons,
                suspended_until: admin.suspended_until 
            });
        }

        try {
            const match = await bcrypt.compare(password, admin.password);

            // 3. KUNG MALI ANG PASSWORD
            if (!match) {
                createAuditLog(req, 'SECURITY_ADMIN_LOGIN_FAILURE', { reason: 'Wrong password' }, email);
                return res.json({ success: false, message: 'Invalid Email or Password' });
            }

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

/* --- GET USER NOTIFICATIONS --- */
app.get('/api/user/notifications', requireUser, (req, res) => {
    const userId = req.session.userId;
    const sql = "SELECT * FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC";

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Database Error fetching notifications:", err);
            return res.status(500).json({ success: false, message: "Database Error" });
        }
        res.json(results);
    });
});

/* --- MARK NOTIFICATION AS READ --- */
app.post('/api/user/notifications/read/:id', requireUser, (req, res) => {
    const notifId = req.params.id;
    const userId = req.session.userId; 

    const sql = "UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?";

    db.execute(sql, [notifId, userId], (err, result) => {
        if (err) {
            console.error("Database Error marking notif as read:", err);
            return res.status(500).json({ success: false, message: "Database Error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.json({ success: true, message: "Notification marked as seen" });
    });
});

/* ADMIN LOGOUT */
app.post('/admin/logout', (req, res) => {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.clearCookie('connect.sid', { 
            path: '/', 
            httpOnly: true,
            sameSite: 'lax'
        }); 

        return res.json({ success: true });
    });
});

/* --- UNIFIED ADMIN SESSION CHECK --- */
app.get('/admin/me', requireAdmin, (req, res) => {
    const sql = 'SELECT id, name, email, contact_number FROM admins WHERE id = ?';
    db.query(sql, [req.session.admin.id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ success: false, message: 'Session Invalid' });
        }
        res.json(results[0]);
    });
});

app.post('/submit-report', requireUser, upload.single('image'), async (req, res) => {
    try {
        const currentUserId = req.session.userId;
        const { 
            itemName, category, location, reportType, brand, 
            incidentDate, incidentTime, description, contactPhone, contactEmail,
            firstName, lastName // 🟢 Kinukuha na ang firstName at lastName mula sa HTML form
        } = req.body;

        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
        const formattedDate = incidentDate && incidentDate.trim() !== '' ? incidentDate : null;
        const formattedTime = incidentTime && incidentTime.trim() !== '' ? incidentTime : null;

        const insertQuery = `
            INSERT INTO items (
                user_id, item_name, category, location, report_type, brand, 
                incident_date, incident_time, description, 
                contact_firstname, contact_lastname, contact_phone, contact_email, 
                image_path, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Approval')
        `;

        db.query(insertQuery, [
            currentUserId, itemName, category, location, reportType, brand, 
            formattedDate, formattedTime, description, 
            firstName, lastName, contactPhone, contactEmail, 
            imagePath
        ], (err, result) => {
            if (err) {
                console.error("Submit Report Error:", err);
                return res.status(500).json({ success: false, message: "Database Error: " + err.message });
            }

            res.json({ success: true, message: "Report submitted successfully and pending approval!" });
        });
    } catch (catchErr) {
        console.error("Server Exception:", catchErr);
        res.status(500).json({ success: false, message: "Server error during submission." });
    }
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
    const sql = `
        SELECT *, 
            DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate, 
            TIME_FORMAT(incident_time, '%h:%i %p') as formattedTime 
        FROM items 
        WHERE status IN ('Published', 'Resolved') 
          AND (is_archived = 0 OR is_archived IS NULL) 
        ORDER BY created_at DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const maskedResults = results.map(item => ({
            ...item,
            contact_phone: item.contact_phone 
                ? item.contact_phone.replace(/(\d{4})(\d+)(\d{3})/, "$1-****-$3") 
                : "N/A",
            contact_email: item.contact_email 
                ? item.contact_email.replace(/(.{2})(.*)(@.*)/, "$1**$3") 
                : "N/A"
        }));

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

app.get('/api/admin/items', requireAdmin, (req, res) => {
    const sql = `SELECT *, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate FROM items ORDER BY id DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

/* ADMIN STATUS UPDATE ROUTE (With Matching Logic) */
/* ADMIN STATUS UPDATE ROUTE (English Notifications) */
app.post('/api/admin/update-status', requireAdmin, async (req, res) => {
    const { itemId, newStatus } = req.body;

    const updateSql = "UPDATE items SET status = ? WHERE id = ?";

    db.query(updateSql, [newStatus, itemId], (err) => {
        if (err) {
            console.error("DB Update Error:", err);
            return res.status(500).json({ success: false, message: "Database update failed" });
        }

        createAuditLog(req, `ADMIN_STATUS_${newStatus.toUpperCase()}`, { itemId, status: newStatus });

        if (newStatus === 'Published') {
            db.query("SELECT * FROM items WHERE id = ?", [itemId], (itemErr, itemResults) => {
                if (!itemErr && itemResults.length > 0) {
                    const approvedItem = itemResults[0];
                    const oppositeType = (approvedItem.report_type === 'Lost') ? 'Found' : 'Lost';

                    const matchQuery = `
                        SELECT id, user_id, item_name 
                        FROM items 
                        WHERE category = ? 
                          AND location = ? 
                          AND report_type = ? 
                          AND user_id != ? 
                          AND status = 'Published'
                          AND (is_archived = 0 OR is_archived IS NULL)
                    `;

                    db.query(matchQuery, [approvedItem.category, approvedItem.location, oppositeType, approvedItem.user_id], (matchErr, matches) => {
                        if (!matchErr && matches && matches.length > 0) {
                            
                            // 🟢 ENGLISH NOTIFICATION FOR NEWLY APPROVED REPORT
                            const notifForNew = `A matching ${oppositeType.toLowerCase()} item was found in ${approvedItem.location}! Check match updates.`;
                            db.query(`INSERT INTO user_notifications (user_id, message, item_id) VALUES (?, ?, ?)`, 
                                [approvedItem.user_id, notifForNew, matches[0].id]);

                            // 🟢 ENGLISH NOTIFICATION FOR EXISTING MATCH POST OWNERS
                            matches.forEach(match => {
                                const notifForExisting = `A new ${approvedItem.report_type.toLowerCase()} report in ${approvedItem.location} (${approvedItem.item_name}) might match your post!`;
                                db.query(`INSERT INTO user_notifications (user_id, message, item_id) VALUES (?, ?, ?)`, 
                                    [match.user_id, notifForExisting, approvedItem.id]);
                            });
                        }
                    });
                }
            });
        }

        res.json({ success: true, message: "Status updated in DB" });
    });
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

/* ADMIN USER MANAGEMENT ROUTES */
app.use("/api/admin-users", requireAdmin, adminUsersRoute);
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

    const categorySql = `
        SELECT category, COUNT(*) as count 
        FROM items 
        ${whereClause}
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 5;`;

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

                res.json({
                    monthly: monthlyResults,
                    categories: categoryResults,
                    locations: locationResults
                });
            });
        });
    });
});

app.post('/api/admin-users/add', requireAdmin, csrfProtection, async (req, res) => {
    const { name, email, contact_number, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
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

/* --- DIRECT PROFILE UPDATE (Name, Contact, DoB) --- */
app.put('/api/user/update-profile', requireUser, (req, res) => {
    const userId = req.session.userId;
    const { name, email, contact_number, dob } = req.body;

    const sql = `UPDATE users SET name = ?, email = ?, contact_number = ?, dob = ? WHERE id = ?`;
    
    db.query(sql, [name, email, contact_number, dob || null, userId], (err, result) => {
        if (err) {
            console.error("MySQL Profile Update Error:", err);
            return res.status(500).json({ success: false, message: "Database update error." });
        }
        res.json({ success: true, message: "Profile updated successfully!" });
    });
});

// GET Active Items
app.get('/api/items/active', requireAdmin, (req, res) => {
    const sql = "SELECT * FROM items WHERE (is_archived = 0 OR is_archived IS NULL) ORDER BY id DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Failed to fetch active items" });
        res.json(results);
    });
});

// GET Archived Items
app.get('/api/items/archived', (req, res) => {
    const query = "SELECT *, DATE_FORMAT(archived_at, '%b %d, %Y') as archivedDate FROM items WHERE is_archived = 1 ORDER BY archived_at DESC, created_at DESC";
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// PUT Archive Item Action (MANUAL ROUTE)
app.put('/api/items/:id/archive', requireAdmin, (req, res) => {
    const sql = "UPDATE items SET is_archived = 1, archived_at = NOW() WHERE id = ?";
    db.query(sql, [req.params.id], (err) => {
        if (err) {
            console.error("Error archiving item:", err);
            return res.status(500).json({ error: "Failed to archive item" });
        }
        res.json({ message: "Item archived successfully" });
    });
});

// GET Dynamic Item by ID
app.get('/api/items/:id', (req, res) => {
    const itemId = req.params.id;

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

// PUT Unarchive / Restore Item Action
app.put('/api/items/:id/unarchive', requireAdmin, (req, res) => {
    const sql = "UPDATE items SET is_archived = 0, archived_at = NULL WHERE id = ?";
    db.query(sql, [req.params.id], (err) => {
        if (err) {
            console.error("Error unarchiving item:", err);
            return res.status(500).json({ error: "Failed to restore item" });
        }
        res.json({ message: "Item restored successfully" });
    });
});

// PUT Update Status (For Resolve Action)
app.put('/api/items/:id/status', requireAdmin, (req, res) => {
    const { status } = req.body;
    const sql = "UPDATE items SET status = ? WHERE id = ?";
    db.query(sql, [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Failed to update status" });
        res.json({ message: "Status updated successfully" });
    });
});

/* --- REQUEST EMAIL CHANGE OTP --- */
app.post('/api/user/request-email-change', requireUser, async (req, res) => {
    const { newEmail } = req.body;

    db.query("SELECT id FROM users WHERE email = ?", [newEmail], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database Error" });
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: "Email is already in use by another account." });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        req.session.emailOtp = {
            code: otpCode,
            pendingEmail: newEmail,
            expiresAt: Date.now() + 10 * 60 * 1000
        };

        const mailOptions = {
            from: '"ReFoundly" <refoundlynoreply@gmail.com>',
            to: newEmail,
            subject: 'ReFoundly - Email Change Verification',
            html: `
            <body style="margin: 0; padding: 40px 10px; background-color: #f9f9f9; font-family: sans-serif;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td align="center">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px 30px; text-align: center;">
                                <tr>
                                    <td>
                                        <h2 style="color: #333333; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Email Change Verification</h2>
                                        <p style="color: #555555; font-size: 15px; line-height: 1.5; margin: 0 0 30px 0;">A request was made to update your ReFoundly account email. Use this code to verify your new email address:</p>
                                        <div style="color: #6B9E45; font-size: 38px; font-weight: bold; letter-spacing: 4px; margin: 20px 0 30px 0;">${otpCode}</div>
                                        <p style="color: #888888; font-size: 12px; margin: 0;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>`
        };

        try {
            await transporter.sendMail(mailOptions);
            res.json({ success: true, message: "Verification code sent!" });
        } catch (mailErr) {
            console.error("Mail Send Error:", mailErr);
            res.status(500).json({ success: false, message: "Failed to send email." });
        }
    });
});

/* --- VERIFY EMAIL CHANGE OTP --- */
app.post('/api/user/verify-email-change', requireUser, (req, res) => {
    const { otp, newEmail } = req.body;
    const sessionOtp = req.session.emailOtp;

    if (!sessionOtp || sessionOtp.pendingEmail !== newEmail) {
        return res.status(400).json({ success: false, message: "No verification request found." });
    }

    if (Date.now() > sessionOtp.expiresAt) {
        return res.status(400).json({ success: false, message: "Code has expired." });
    }

    if (sessionOtp.code !== otp) {
        return res.status(400).json({ success: false, message: "Invalid verification code." });
    }

    const userId = req.session.userId;
    db.query("UPDATE users SET email = ? WHERE id = ?", [newEmail, userId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database update error." });

        delete req.session.emailOtp;
        res.json({ success: true, message: "Email updated successfully!" });
    });
});

app.post('/api/user/change-password', requireUser, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character (@$!%*?&).'
      });
    }

    db.query('SELECT password FROM users WHERE id = ?', [userId], async (err, results) => {
      if (err || results.length === 0) {
        return res.status(500).json({ success: false, message: 'User not found or database error.' });
      }

      const user = results[0];

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password.' });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ success: false, message: 'Failed to update password.' });
        }

        createAuditLog(req, 'USER_PASSWORD_CHANGE', { userId });

        return res.json({ success: true, message: 'Password updated successfully!' });
      });
    });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/* GLOBAL ERROR HANDLER (Iwas HTML response sa server errors) */
app.use((err, req, res, next) => {
    console.error("❌ Express Server Error:", err.stack || err.message);
    res.status(500).json({
        success: false,
        message: err.message || "Server error occurred during request."
    });
});

/* --- PROTECTED ROUTES --- */
app.get('/dashboard.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'dashboard.html')));
app.get('/report.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'report.html')));
app.get('/user_acc.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'user_acc.html')));
app.get('/history.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'history.html')));
app.get('/message.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'message.html')));

app.get('/AdHome.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'User', 'AdHome.html')));
app.get('/AdReport.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'User', 'AdReport.html')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'User', 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'User', 'index.html')));

/* --- STATIC FILES MIDDLEWARE --- */
app.use(express.static(path.join(__dirname, 'User')));
app.use('/uploads', express.static(path.join(__dirname, 'User', 'uploads')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});