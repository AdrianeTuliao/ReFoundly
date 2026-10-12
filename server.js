/*--Imports & Dependencies--*/
require('dotenv').config(); 
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');

const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const adminUsersRoute = require("./Routes/adminUsers.js");

/*--App Initialization--*/
const app = express();

/*--CORS & Body Parser Setup--*/
const cors = require('cors');
app.use(cors({
    origin: 'http://127.0.0.1:5500', 
    credentials: true
}));

app.use(express.json());

/*--Database Connection--*/
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'refoundly_app',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'refoundly_db'
});

/*--File Upload Configuration (Multer)--*/
const storage = multer.diskStorage({
    destination: './User/uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — anything larger is rejected before it touches disk
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
        }
    }
});

// Same storage/limits/filter as `upload`, dedicated to chat image
// attachments so it can be wired independently of the report-form uploader.
const chatImageUpload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
        }
    }
});

/*--Connect To Database--*/
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to ReFoundly Database');
});

/*--Audit Log Helper--*/
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

/*--Middleware--*/
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

/*--Rate Limiters--*/
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

/*--Session Configuration--*/
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

/*--CSRF Protection Setup--*/
const csrfProtection = csrf({ cookie: true });

app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

/*--Auth Middleware: requireUser--*/
function requireUser(req, res, next) {
    if (req.session && req.session.userId) {
        // Only fetch the 'status' column from the DB
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

/*--Auth Middleware: requireAdmin--*/
function requireAdmin(req, res, next) {
    if (req.session && req.session.admin) {
        // Only fetch the 'status' column for Admin
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

/*--API Routes--*/
app.get('/api/get-session-info', (req, res) => {
    if (req.session.userId) {
        res.json({ success: true, userId: req.session.userId });
    } else {
        res.status(401).json({ success: false, message: "No active session" });
    }
});

/*--User Logout--*/
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

/*--Get Current User--*/
app.get('/user/me', requireUser, (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authorized" });
    const query = "SELECT name, email, contact_number, dob FROM users WHERE id = ?";
    db.query(query, [req.session.userId], (err, results) => {
        if (err || results.length === 0) return res.status(500).send(err);
        res.json(results[0]);
    });
});

/*--Email Transporter Setup (Nodemailer)--*/
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

/*--User Registration (OTP)--*/
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

/*--User Login (OTP)--*/
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
            
            // parse suspend_reasons in DB
            let parsedReasons = [];
            try {
                parsedReasons = user.suspend_reasons ? JSON.parse(user.suspend_reasons) : [];
            } catch (e) {
                parsedReasons = user.suspend_reasons ? [user.suspend_reasons] : [];
            }

            // pass suspend_reasons and suspend_until in front end
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

/*--Forgot Password: Send OTP--*/
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

/*--Forgot Password: Verify & Update--*/
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

/*--Verify Registration OTP--*/
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

/*--Verify Login OTP--*/
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

/*--Admin Login--*/
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

/*--Get User Notifications--*/
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

/*--Mark Notification As Read--*/
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

/*--Admin Logout--*/
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

/*--Admin Session Check--*/
app.get('/admin/me', requireAdmin, (req, res) => {
    const sql = 'SELECT id, name, email, contact_number FROM admins WHERE id = ?';
    db.query(sql, [req.session.admin.id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ success: false, message: 'Session Invalid' });
        }
        res.json(results[0]);
    });
});

/*--Server-side input sanitization/validation for report submissions--*
   Client-side checks in report.js are UX only — they don't run at all if
   someone POSTs to this endpoint directly (Postman, curl, disabled JS).
   Everything that actually matters has to be enforced here. */
function stripTags(value) {
    // Removes literal HTML tags entirely rather than escaping them, so
    // "<html></html>", "<script>...</script>", "<img onerror=...>" etc.
    // never reach the database as markup in the first place.
    return String(value || '').replace(/<[^>]*>/g, '').trim();
}

function validateReportFields(body) {
    const errors = [];
    const clean = {};

    const requiredText = {
        itemName: { label: 'Item name', max: 100 },
        category: { label: 'Category', max: 50 },
        location: { label: 'Location', max: 100 },
        firstName: { label: 'First name', max: 50 },
        lastName: { label: 'Last name', max: 50 }
    };

    for (const [field, rules] of Object.entries(requiredText)) {
        const value = stripTags(body[field]);
        if (!value) {
            errors.push(`${rules.label} is required.`);
        } else if (value.length > rules.max) {
            errors.push(`${rules.label} must be ${rules.max} characters or fewer.`);
        }
        clean[field] = value;
    }

    // Category must match one of the actual dropdown options (see dashboard.html) —
    // a raw POST could otherwise send anything here.
    const validCategories = [
        'wallet', 'gadgets', 'accessories', 'clothing', 'id',
        'documents', 'books', 'school supplies', 'tools', 'others'
    ];
    if (!validCategories.includes(clean.category.toLowerCase())) {
        errors.push('Category must be one of the listed options.');
    }

    // Description and brand are optional but still get stripped + capped.
    clean.description = stripTags(body.description).slice(0, 1000);
    clean.brand = stripTags(body.brand).slice(0, 50);

    // Report type must be one of the two real values — never trust the raw string.
    const reportType = String(body.reportType || '').trim().toLowerCase();
    if (reportType !== 'lost' && reportType !== 'found') {
        errors.push('Report type must be either Lost or Found.');
    }
    clean.reportType = reportType === 'lost' ? 'Lost' : 'Found';

    // Email: basic format check.
    const email = String(body.contactEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('A valid contact email is required.');
    }
    clean.contactEmail = email.slice(0, 100);

    // Phone: digits only after stripping common separators, reasonable length.
    const phoneDigits = String(body.contactPhone || '').replace(/[\s\-()]/g, '');
    if (!/^[0-9]{7,15}$/.test(phoneDigits)) {
        errors.push('A valid contact phone number is required.');
    }
    clean.contactPhone = phoneDigits;

    // Incident date/time: optional, but if provided must match a real date
    // or time format. Without this, an invalid string (or an injection
    // attempt) gets handed straight to a MySQL DATE/TIME column, which
    // MySQL will often silently coerce to 0000-00-00 / NULL rather than
    // erroring — so bad input was disappearing instead of being rejected.
    const rawDate = String(body.incidentDate || '').trim();
    if (rawDate) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || isNaN(new Date(rawDate).getTime())) {
            errors.push('Incident date must be a valid date (YYYY-MM-DD).');
            clean.incidentDate = null;
        } else {
            clean.incidentDate = rawDate;
        }
    } else {
        clean.incidentDate = null;
    }

    const rawTime = String(body.incidentTime || '').trim();
    if (rawTime) {
        if (!/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(rawTime)) {
            errors.push('Incident time must be a valid 24-hour time (HH:MM).');
            clean.incidentTime = null;
        } else {
            clean.incidentTime = rawTime;
        }
    } else {
        clean.incidentTime = null;
    }

    // Whether the reporter flagged their own uploaded photo as showing a
    // valid ID, cash, or other sensitive document — never trust a raw
    // string here, only "1"/"true" counts as checked.
    const selfFlagged = ['1', 'true', 'on'].includes(String(body.isSensitiveImage || '').toLowerCase());

    // Don't rely on the reporter to remember to check that box — a photo
    // reported under the "ID" or "Documents" category is automatically
    // treated as sensitive and blurred, regardless of the checkbox.
    const autoSensitiveCategory = ['id', 'documents'].includes(clean.category.toLowerCase());

    clean.isSensitiveImage = (selfFlagged || autoSensitiveCategory) ? 1 : 0;

    return { errors, clean };
}

/*--Submit Item Report--*/
app.post('/submit-report', requireUser, upload.single('image'), async (req, res) => {
    try {
        const currentUserId = req.session.userId;

        const { errors, clean } = validateReportFields(req.body);
        if (errors.length > 0) {
            // Reject clearly — no partial/garbage rows ever get inserted.
            return res.status(400).json({ success: false, message: errors.join(' ') });
        }

        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        const insertQuery = `
            INSERT INTO items (
                user_id, item_name, category, location, report_type, brand,
                incident_date, incident_time, description,
                contact_firstname, contact_lastname, contact_phone, contact_email,
                image_path, is_sensitive_image, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Approval')
        `;

        db.query(insertQuery, [
            currentUserId, clean.itemName, clean.category, clean.location, clean.reportType, clean.brand,
            clean.incidentDate, clean.incidentTime, clean.description,
            clean.firstName, clean.lastName, clean.contactPhone, clean.contactEmail,
            imagePath, clean.isSensitiveImage
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

/*--Get User Report History--*/
app.get('/api/user-history', requireUser, (req, res) => {
    const sql = `SELECT *, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate, TIME_FORMAT(incident_time, '%h:%i %p') as formattedTime 
                 FROM items WHERE user_id = ? ORDER BY created_at DESC`;
    db.query(sql, [req.session.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

/*--Published Items (Public)--*/
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

/*--Lost Items (Public)--*/
app.get('/api/items/lost', (req, res) => {
    const sql = `SELECT *, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate, TIME_FORMAT(incident_time, '%h:%i %p') as formattedTime
                 FROM items WHERE status = 'Published' AND report_type = 'Lost' ORDER BY created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

/*--Found Items (Public)--*/
app.get('/api/items/found', (req, res) => {
    const sql = `SELECT *, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate, TIME_FORMAT(incident_time, '%h:%i %p') as formattedTime
                 FROM items WHERE status = 'Published' AND report_type = 'Found' ORDER BY created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

/*--All Items (Admin)--*/
app.get('/api/admin/items', requireAdmin, (req, res) => {
    const sql = `SELECT *, DATE_FORMAT(incident_date, '%b %d, %Y') as formattedDate FROM items ORDER BY id DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

/*--Admin: Update Item Status & Match Notifications--*/
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
                            const notifForNew = `Possible item match! A ${oppositeType.toLowerCase()} item was found in ${approvedItem.location}. Check match updates.`;
                            db.query(`INSERT INTO user_notifications (user_id, message, item_id) VALUES (?, ?, ?)`, 
                                [approvedItem.user_id, notifForNew, matches[0].id]);

                            // 🟢 ENGLISH NOTIFICATION FOR EXISTING MATCH POST OWNERS
                            matches.forEach(match => {
                                const notifForExisting = `Possible item match! A new ${approvedItem.report_type.toLowerCase()} report in ${approvedItem.location} (${approvedItem.item_name}) might match your post.`;
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

/*--Admin: Get User Reports (from the chat "Report User" button)--*/
app.get('/api/admin/user-reports', requireAdmin, (req, res) => {
    const sql = `
        SELECT
            ur.id,
            ur.reason,
            ur.details,
            ur.status,
            ur.conversation_id,
            DATE_FORMAT(ur.created_at, '%b %d, %Y %h:%i %p') AS formattedDate,
            ur.created_at,

            reporter.id   AS reporter_id,
            reporter.name  AS reporter_name,
            reporter.email AS reporter_email,

            reported.id    AS reported_user_id,
            reported.name  AS reported_user_name,
            reported.email AS reported_user_email,
            reported.status AS reported_user_account_status,

            i.item_name AS item_name

        FROM user_reports ur
        JOIN users reporter  ON reporter.id = ur.reporter_id
        JOIN users reported  ON reported.id = ur.reported_user_id
        LEFT JOIN conversations c ON c.id = ur.conversation_id
        LEFT JOIN items i ON i.id = c.item_id
        ORDER BY ur.created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Fetch user reports error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

/*--Admin: Update a User Report's Status (reviewed / dismissed)--*/
app.post('/api/admin/user-reports/:id/status', requireAdmin, (req, res) => {
    const reportId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const allowedStatuses = ['pending', 'reviewed', 'dismissed'];
    if (!reportId || !allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid report or status." });
    }

    db.query("UPDATE user_reports SET status = ? WHERE id = ?", [status, reportId], (err, result) => {
        if (err) {
            console.error("Update user report status error:", err);
            return res.status(500).json({ success: false, message: "Database update failed." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Report not found." });
        }

        createAuditLog(req, `ADMIN_USER_REPORT_${status.toUpperCase()}`, { reportId, status });
        res.json({ success: true, message: "Report status updated." });
    });
});

/*--Admin: Get Audit Logs--*/
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

/*--Admin User Management Routes--*/
app.use("/api/admin-users", requireAdmin, adminUsersRoute);
/*--Static Files & Dashboard Pages--*/
app.get('/dashboard.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'dashboard.html')));
app.get('/user_acc.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'user_acc.html')));
app.get('/AdHome.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'Admin', 'AdHome.html')));
app.get('/AdReport.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'Admin', 'AdReport.html')));

app.use(express.static(path.join(__dirname, 'User')));
app.use(express.static(path.join(__dirname, 'Admin')));
app.use('/uploads', express.static(path.join(__dirname, 'User', 'uploads')));

/*--Admin: Dashboard Stats--*/
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

/*--Admin: Recent Activity--*/
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

/*--Admin: Analytics--*/
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

/*--Admin: Add Admin Account--*/
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

/*--Update User Profile--*/
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

/*--Admin: Get Active Items--*/
app.get('/api/items/active', requireAdmin, (req, res) => {
    const sql = "SELECT * FROM items WHERE (is_archived = 0 OR is_archived IS NULL) ORDER BY id DESC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Failed to fetch active items" });
        res.json(results);
    });
});

/*--Get Archived Items--*/
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

/*--Archive Item--*/
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

/*--Get Item By ID--*/
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

/*--Unarchive Item--*/
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

/*--Update Item Status (Resolve)--*/
app.put('/api/items/:id/status', requireAdmin, (req, res) => {
    const { status } = req.body;
    const sql = "UPDATE items SET status = ? WHERE id = ?";
    db.query(sql, [status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Failed to update status" });
        res.json({ message: "Status updated successfully" });
    });
});

/*--Request Email Change OTP--*/
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
            from: `"ReFoundly" <${process.env.EMAIL_USER}>`,
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

/*--Verify Email Change OTP--*/
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

/*--Request Password Change OTP--*
   Step 1 of 2: confirm the current password, then email a code to the
   account's existing address before allowing the change to go through. */
app.post('/api/user/request-password-change-otp', requireUser, async (req, res) => {
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

    db.query('SELECT email, password FROM users WHERE id = ?', [userId], async (err, results) => {
      if (err || results.length === 0) {
        return res.status(500).json({ success: false, message: 'User not found or database error.' });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password.' });
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // The new password is only kept in the server-side session (never
      // sent back to the client, never logged) until the OTP is verified.
      req.session.passwordChangeOtp = {
        code: otpCode,
        newPasswordHash: await bcrypt.hash(newPassword, 10),
        expiresAt: Date.now() + 10 * 60 * 1000
      };

      const mailOptions = {
        from: `"ReFoundly" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'ReFoundly - Password Change Verification',
        html: `
        <body style="margin: 0; padding: 40px 10px; background-color: #f9f9f9; font-family: sans-serif;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td align="center">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 40px 30px; text-align: center;">
                            <tr>
                                <td>
                                    <h2 style="color: #333333; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Password Change Verification</h2>
                                    <p style="color: #555555; font-size: 15px; line-height: 1.5; margin: 0 0 30px 0;">A request was made to change your ReFoundly account password. Use this code to confirm the change:</p>
                                    <div style="color: #6B9E45; font-size: 38px; font-weight: bold; letter-spacing: 4px; margin: 20px 0 30px 0;">${otpCode}</div>
                                    <p style="color: #888888; font-size: 12px; margin: 0;">This code will expire in 10 minutes. If you did not request this, your password has NOT been changed — you can safely ignore this email.</p>
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
        res.json({ success: true, message: "Verification code sent to your email!" });
      } catch (mailErr) {
        console.error("Password OTP Mail Error:", mailErr);
        res.status(500).json({ success: false, message: "Failed to send verification email." });
      }
    });
  } catch (error) {
    console.error('Request password change OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/*--Change Password (Step 2 of 2: verify OTP, then apply the pre-hashed new password)--*/
app.post('/api/user/change-password', requireUser, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { otp } = req.body;
    const pending = req.session.passwordChangeOtp;

    if (!pending) {
      return res.status(400).json({ success: false, message: 'No pending password change request found. Please start over.' });
    }
    if (Date.now() > pending.expiresAt) {
      delete req.session.passwordChangeOtp;
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please start over.' });
    }
    if (!otp || pending.code !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    db.query('UPDATE users SET password = ? WHERE id = ?', [pending.newPasswordHash, userId], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ success: false, message: 'Failed to update password.' });
      }

      delete req.session.passwordChangeOtp;
      createAuditLog(req, 'USER_PASSWORD_CHANGE', { userId });

      return res.json({ success: true, message: 'Password updated successfully!' });
    });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

/*--Report a User (e.g. from the "Report User" option inside a chat)--*/
app.post('/api/users/:userId/report', requireUser, (req, res) => {
    const reporterId = req.session.userId;
    const reportedUserId = parseInt(req.params.userId, 10);
    const { conversationId, reason, details } = req.body;

    if (!reportedUserId || Number.isNaN(reportedUserId) || reportedUserId === reporterId) {
        return res.status(400).json({ success: false, message: "Invalid user to report." });
    }

    const allowedReasons = ['scam', 'harassment', 'fake_item', 'no_show', 'other'];
    if (!allowedReasons.includes(reason)) {
        return res.status(400).json({ success: false, message: "Please select a valid reason." });
    }

    const cleanDetails = (details || '').toString().trim().slice(0, 500);
    const convoId = conversationId ? parseInt(conversationId, 10) : null;

    const sql = `
        INSERT INTO user_reports (reporter_id, reported_user_id, conversation_id, reason, details, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `;

    db.query(sql, [reporterId, reportedUserId, convoId, reason, cleanDetails], (err) => {
        if (err) {
            console.error("User report insert error:", err);
            return res.status(500).json({ success: false, message: "Failed to submit report." });
        }

        createAuditLog(req, 'USER_REPORTED', { reportedUserId, reason, conversationId: convoId });
        res.json({ success: true, message: "Report submitted. Our team will review it shortly." });
    });
});

/*-- Messaging System --*/

/*
    START OR OPEN CONVERSATION
    ---------------------------
    Called when a user clicks "Chat with User"
*/
app.post('/api/conversations/start', requireUser, (req, res) => {
    const currentUserId = req.session.userId;
    const { itemId } = req.body;

    if (!itemId) {
        return res.status(400).json({
            success: false,
            message: "Item ID is required."
        });
    }

    // Get the item and its owner
    const itemSql = `
        SELECT id, user_id, item_name, status, is_archived
        FROM items
        WHERE id = ?
    `;

    db.query(itemSql, [itemId], (err, items) => {
        if (err) {
            console.error("Start Conversation Item Error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error."
            });
        }

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Item not found."
            });
        }

        const item = items[0];

        // Prevent chatting with yourself
        if (Number(item.user_id) === Number(currentUserId)) {
            return res.status(403).json({
                success: false,
                message: "You cannot start a conversation with yourself."
            });
        }

        // Only allow conversations for published items
        if (item.status !== 'Published') {
            return res.status(403).json({
                success: false,
                message: "This item is not available for messaging."
            });
        }

        // Do not allow archived items
        if (item.is_archived === 1) {
            return res.status(403).json({
                success: false,
                message: "This item has been archived."
            });
        }

        const ownerId = item.user_id;

        /*
            Always store the smaller user ID as user_one_id.
            This prevents:

            User 1 -> User 5

            from becoming a different conversation than:

            User 5 -> User 1
        */
        const userOneId = Math.min(
            Number(currentUserId),
            Number(ownerId)
        );

        const userTwoId = Math.max(
            Number(currentUserId),
            Number(ownerId)
        );

        // Find existing conversation
        const findSql = `
            SELECT id
            FROM conversations
            WHERE item_id = ?
              AND user_one_id = ?
              AND user_two_id = ?
            LIMIT 1
        `;

        db.query(
            findSql,
            [itemId, userOneId, userTwoId],
            (findErr, conversations) => {

                if (findErr) {
                    console.error("Conversation Lookup Error:", findErr);

                    return res.status(500).json({
                        success: false,
                        message: "Database error."
                    });
                }

                // Existing conversation
                if (conversations.length > 0) {
                    return res.json({
                        success: true,
                        conversationId: conversations[0].id,
                        existing: true
                    });
                }

                // Create new conversation
                const insertSql = `
                    INSERT INTO conversations
                    (
                        item_id,
                        user_one_id,
                        user_two_id
                    )
                    VALUES (?, ?, ?)
                `;

                db.query(
                    insertSql,
                    [itemId, userOneId, userTwoId],
                    (insertErr, result) => {

                        if (insertErr) {
                            console.error(
                                "Create Conversation Error:",
                                insertErr
                            );

                            return res.status(500).json({
                                success: false,
                                message: "Unable to create conversation."
                            });
                        }

                        res.json({
                            success: true,
                            conversationId: result.insertId,
                            existing: false
                        });
                    }
                );
            }
        );
    });
});


/*
    GET USER'S CONVERSATIONS
*/
app.get('/api/conversations', requireUser, (req, res) => {

    const currentUserId = req.session.userId;

    const sql = `
        SELECT
            c.id AS conversation_id,
            c.item_id,

            i.item_name,
            i.image_path,
            i.report_type,

            CASE
                WHEN c.user_one_id = ? THEN c.user_two_id
                ELSE c.user_one_id
            END AS other_user_id,

            u.name AS other_user_name,

            (
                SELECT m.message
                FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC
                LIMIT 1
            ) AS last_message,

            (
                SELECT m.created_at
                FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC
                LIMIT 1
            ) AS last_message_time,

            (
                SELECT COUNT(*)
                FROM messages m
                WHERE m.conversation_id = c.id
                  AND m.sender_id != ?
                  AND m.is_read = 0
            ) AS unread_count

        FROM conversations c

        INNER JOIN items i
            ON i.id = c.item_id

        INNER JOIN users u
            ON u.id =
                CASE
                    WHEN c.user_one_id = ? THEN c.user_two_id
                    ELSE c.user_one_id
                END

        WHERE c.user_one_id = ?
           OR c.user_two_id = ?

        ORDER BY
            COALESCE(c.updated_at, c.created_at) DESC
    `;

    const params = [
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId,
        currentUserId
    ];

    db.query(sql, params, (err, results) => {

        if (err) {
            console.error("Conversation List Error:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to load conversations."
            });
        }

        res.json({
            success: true,
            conversations: results
        });
    });
});


/*
    GET ONE CONVERSATION
*/
app.get('/api/conversations/:conversationId', requireUser, (req, res) => {

    const currentUserId = req.session.userId;
    const conversationId = req.params.conversationId;

    const sql = `
        SELECT
            c.id,
            c.item_id,
            i.item_name,
            i.image_path,
            i.report_type,

            CASE
                WHEN c.user_one_id = ? THEN c.user_two_id
                ELSE c.user_one_id
            END AS other_user_id,

            u.name AS other_user_name

        FROM conversations c

        INNER JOIN items i
            ON i.id = c.item_id

        INNER JOIN users u
            ON u.id =
                CASE
                    WHEN c.user_one_id = ? THEN c.user_two_id
                    ELSE c.user_one_id
                END

        WHERE c.id = ?
          AND (
              c.user_one_id = ?
              OR c.user_two_id = ?
          )

        LIMIT 1
    `;

    db.query(
        sql,
        [
            currentUserId,
            currentUserId,
            conversationId,
            currentUserId,
            currentUserId
        ],
        (err, results) => {

            if (err) {
                console.error("Conversation Error:", err);

                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Conversation not found."
                });
            }

            res.json({
                success: true,
                conversation: results[0]
            });
        }
    );
});


/*
    GET MESSAGES
*/
app.get(
    '/api/conversations/:conversationId/messages',
    requireUser,
    (req, res) => {

        const currentUserId = req.session.userId;
        const conversationId = req.params.conversationId;

        // Verify that user belongs to conversation
        const accessSql = `
            SELECT id
            FROM conversations
            WHERE id = ?
              AND (
                  user_one_id = ?
                  OR user_two_id = ?
              )
            LIMIT 1
        `;

        db.query(
            accessSql,
            [
                conversationId,
                currentUserId,
                currentUserId
            ],
            (accessErr, accessResults) => {

                if (accessErr) {
                    return res.status(500).json({
                        success: false,
                        message: "Database error."
                    });
                }

                if (accessResults.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: "You do not have access to this conversation."
                    });
                }

                const messageSql = `
                    SELECT
                        m.id,
                        m.sender_id,
                        m.message,
                        m.message_type,
                        m.image_url,
                        m.is_sensitive,
                        m.is_read,
                        m.created_at,
                        u.name AS sender_name

                    FROM messages m

                    INNER JOIN users u
                        ON u.id = m.sender_id

                    WHERE m.conversation_id = ?

                    ORDER BY m.created_at ASC
                `;

                db.query(
                    messageSql,
                    [conversationId],
                    (msgErr, messages) => {

                        if (msgErr) {
                            console.error(
                                "Messages Fetch Error:",
                                msgErr
                            );

                            return res.status(500).json({
                                success: false,
                                message: "Failed to load messages."
                            });
                        }

                        // Mark messages from other user as read
                        db.query(
                            `
                            UPDATE messages
                            SET is_read = 1
                            WHERE conversation_id = ?
                              AND sender_id != ?
                        `,
                            [
                                conversationId,
                                currentUserId
                            ],
                            () => {}
                        );

                        // Sensitive photos: don't hand the recipient the real
                        // image_url up front (that would let the 2-view limit
                        // be bypassed just by inspecting the response/network
                        // tab). Strip it here and let the client fetch it
                        // on demand via POST /api/messages/:id/reveal-image,
                        // which is what actually enforces the view count.
                        const sensitiveIds = messages
                            .filter(m => m.is_sensitive && m.message_type === 'image' && Number(m.sender_id) !== Number(currentUserId))
                            .map(m => m.id);

                        const finishUp = (viewCounts) => {
                            const withLimits = messages.map(m => {
                                const isOtherPartySensitive = m.is_sensitive && m.message_type === 'image' && Number(m.sender_id) !== Number(currentUserId);

                                if (!isOtherPartySensitive) {
                                    return { ...m, remainingViews: null };
                                }

                                const used = viewCounts[m.id] || 0;
                                return {
                                    ...m,
                                    image_url: null, // must call reveal-image to get this
                                    remainingViews: Math.max(0, MAX_SENSITIVE_VIEWS - used)
                                };
                            });

                            res.json({ success: true, messages: withLimits });
                        };

                        if (sensitiveIds.length === 0) {
                            return finishUp({});
                        }

                        db.query(
                            `SELECT message_id, view_count FROM message_image_views WHERE viewer_id = ? AND message_id IN (?)`,
                            [currentUserId, sensitiveIds],
                            (viewErr, viewRows) => {
                                if (viewErr) {
                                    console.error("Message View Counts Error:", viewErr);
                                    return finishUp({});
                                }

                                const viewCounts = {};
                                viewRows.forEach(row => { viewCounts[row.message_id] = row.view_count; });
                                finishUp(viewCounts);
                            }
                        );
                    }
                );
            }
        );
    }
);


/*
    SEND MESSAGE (text, or an image attachment)
*/
app.post(
    '/api/conversations/:conversationId/messages',
    requireUser,
    (req, res, next) => {
        // multer only engages for multipart/form-data (image uploads);
        // a plain JSON text message skips straight past it untouched.
        chatImageUpload.single('image')(req, res, (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message || "Failed to upload image."
                });
            }
            next();
        });
    },
    (req, res) => {

        const currentUserId = req.session.userId;
        const conversationId = req.params.conversationId;

        const hasImage = Boolean(req.file);

        const message =
            typeof req.body.message === 'string'
                ? req.body.message.trim()
                : '';

        if (!hasImage && !message) {
            return res.status(400).json({
                success: false,
                message: "Message cannot be empty."
            });
        }

        if (message.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Message is too long."
            });
        }

        const messageType = hasImage ? 'image' : 'text';
        const imageUrl = hasImage ? `/uploads/${req.file.filename}` : null;
        const isSensitive = hasImage && String(req.body.isSensitive) === '1' ? 1 : 0;

        // Verify conversation access (also grab the sender's name for the notification)
        const accessSql = `
            SELECT c.id, c.item_id, c.user_one_id, c.user_two_id, u.name AS sender_name
            FROM conversations c
            JOIN users u ON u.id = ?
            WHERE c.id = ?
              AND (
                  c.user_one_id = ?
                  OR c.user_two_id = ?
              )
            LIMIT 1
        `;

        db.query(
            accessSql,
            [
                currentUserId,
                conversationId,
                currentUserId,
                currentUserId
            ],
            (accessErr, accessResults) => {

                if (accessErr) {
                    return res.status(500).json({
                        success: false,
                        message: "Database error."
                    });
                }

                if (accessResults.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: "You do not have access to this conversation."
                    });
                }

                const insertSql = `
                    INSERT INTO messages
                    (
                        conversation_id,
                        sender_id,
                        message,
                        message_type,
                        image_url,
                        is_sensitive
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                db.query(
                    insertSql,
                    [
                        conversationId,
                        currentUserId,
                        message,
                        messageType,
                        imageUrl,
                        isSensitive
                    ],
                    (insertErr, result) => {

                        if (insertErr) {
                            console.error(
                                "Send Message Error:",
                                insertErr
                            );

                            return res.status(500).json({
                                success: false,
                                message: "Failed to send message."
                            });
                        }

                        // Update conversation timestamp
                        db.query(
                            `
                            UPDATE conversations
                            SET updated_at = NOW()
                            WHERE id = ?
                            `,
                            [conversationId],
                            () => {}
                        );

                        // Notify the other party — best-effort, doesn't block the response.
                        const convo = accessResults[0];
                        const otherUserId = Number(convo.user_one_id) === Number(currentUserId)
                            ? convo.user_two_id
                            : convo.user_one_id;
                        const senderName = convo.sender_name || 'Someone';
                        const preview = hasImage
                            ? (isSensitive ? '📎 Sent a sensitive photo' : '📷 Sent a photo')
                            : (message.length > 80 ? message.slice(0, 77) + '...' : message);

                        db.query(
                            `INSERT INTO user_notifications (user_id, message, item_id, conversation_id) VALUES (?, ?, ?, ?)`,
                            [otherUserId, `New message from ${senderName}: ${preview}`, convo.item_id, conversationId],
                            (notifErr) => {
                                if (notifErr) console.error("Message notification insert failed:", notifErr);
                            }
                        );

                        res.json({
                            success: true,
                            messageId: result.insertId
                        });
                    }
                );
            }
        );
    }
);

/*
    REVEAL A SENSITIVE CHAT IMAGE (view-limited)
    The sender can always see their own photo. Anyone else gets at most
    2 reveals total, enforced server-side (a page refresh doesn't reset it).
*/
const MAX_SENSITIVE_VIEWS = 2;

app.post('/api/messages/:messageId/reveal-image', requireUser, (req, res) => {
    const currentUserId = req.session.userId;
    const messageId = req.params.messageId;

    const sql = `
        SELECT m.id, m.sender_id, m.message_type, m.image_url, m.is_sensitive,
               c.user_one_id, c.user_two_id
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.id = ?
          AND (c.user_one_id = ? OR c.user_two_id = ?)
        LIMIT 1
    `;

    db.query(sql, [messageId, currentUserId, currentUserId], (err, results) => {
        if (err) {
            console.error("Reveal Image Lookup Error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Message not found." });
        }

        const msg = results[0];

        if (msg.message_type !== 'image' || !msg.image_url) {
            return res.status(400).json({ success: false, message: "This message has no image." });
        }

        // The sender always has full, unlimited access to their own photo.
        if (Number(msg.sender_id) === Number(currentUserId)) {
            return res.json({ success: true, imageUrl: msg.image_url, remainingViews: null });
        }

        if (!msg.is_sensitive) {
            // Not flagged sensitive — no view limit applies.
            return res.json({ success: true, imageUrl: msg.image_url, remainingViews: null });
        }

        // Sensitive + viewed by the other party: enforce the view cap.
        db.query(
            `SELECT view_count FROM message_image_views WHERE message_id = ? AND viewer_id = ? LIMIT 1`,
            [messageId, currentUserId],
            (viewErr, viewResults) => {
                if (viewErr) {
                    console.error("Reveal Image View Lookup Error:", viewErr);
                    return res.status(500).json({ success: false, message: "Database error." });
                }

                const currentCount = viewResults.length ? viewResults[0].view_count : 0;

                if (currentCount >= MAX_SENSITIVE_VIEWS) {
                    return res.status(403).json({
                        success: false,
                        message: "View limit reached for this sensitive photo. Ask the sender to resend it if you need to see it again.",
                        remainingViews: 0
                    });
                }

                const newCount = currentCount + 1;

                db.query(
                    `
                    INSERT INTO message_image_views (message_id, viewer_id, view_count)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE view_count = ?
                    `,
                    [messageId, currentUserId, newCount, newCount],
                    (upsertErr) => {
                        if (upsertErr) {
                            console.error("Reveal Image View Upsert Error:", upsertErr);
                            return res.status(500).json({ success: false, message: "Database error." });
                        }

                        res.json({
                            success: true,
                            imageUrl: msg.image_url,
                            remainingViews: MAX_SENSITIVE_VIEWS - newCount
                        });
                    }
                );
            }
        );
    });
});

/* =========================================================
   DEAL AGREEMENT (0/2 -> 2/2 mutual confirmation)
   ========================================================= */

/*
    NOTIFY ADMIN — called once the frontend sees both parties agreed.
    Logs to audit_logs (already shown on the Admin Audit Logs page)
    and flips the conversation into admin_reviewing.
*/
app.post('/api/conversations/:conversationId/agreement/notify-admin', requireUser, (req, res) => {
    const currentUserId = req.session.userId;
    const conversationId = req.params.conversationId;

    const sql = `
        SELECT c.*, i.item_name, i.category, i.report_type,
               ua.name AS user_one_name, ub.name AS user_two_name
        FROM conversations c
        JOIN items i ON i.id = c.item_id
        JOIN users ua ON ua.id = c.user_one_id
        JOIN users ub ON ub.id = c.user_two_id
        WHERE c.id = ? AND (c.user_one_id = ? OR c.user_two_id = ?)
        LIMIT 1
    `;

    db.query(sql, [conversationId, currentUserId, currentUserId], (err, results) => {
        if (err) {
            console.error("Notify Admin Lookup Error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const c = results[0];
        if (Number(c.user_one_agreed) + Number(c.user_two_agreed) < 2) {
            return res.status(400).json({ success: false, message: "Both parties have not agreed yet." });
        }

        const details = JSON.stringify({
            conversationId: c.id,
            itemId: c.item_id,
            itemName: c.item_name,
            barangay: c.meetup_barangay,
            userOne: c.user_one_name,
            userTwo: c.user_two_name
        });

        db.query(
            `INSERT INTO audit_logs (action, details) VALUES ('DEAL_AGREEMENT_READY', ?)`,
            [details],
            (logErr) => {
                if (logErr) console.error("Audit log insert failed:", logErr);
            }
        );

        db.query(
            `UPDATE conversations SET agreement_status = 'admin_reviewing', admin_notified_at = NOW() WHERE id = ?`,
            [conversationId],
            (updateErr) => {
                if (updateErr) {
                    console.error("Notify Admin Update Error:", updateErr);
                    return res.status(500).json({ success: false, message: "Database error." });
                }
                res.json({ success: true, status: 'admin_reviewing' });
            }
        );
    });
});

/*
    REQUEST RESCHEDULE — either party can call this once a meetup has been
    agreed on (both_agreed / admin_reviewing / confirmed). Resets both
    parties' agreement so they have to re-agree, and takes it out of
    'confirmed' so admin has to re-review before another PDF is issued.
*/
app.post('/api/conversations/:conversationId/reschedule', requireUser, (req, res) => {
    const currentUserId = req.session.userId;
    const conversationId = req.params.conversationId;
    const reason = stripTags(req.body.reason).slice(0, 300);
    const newBarangayInput = typeof req.body.barangay === 'string' ? req.body.barangay.trim() : '';
    const newDate = req.body.meetup_date || req.body.date || null;
    const newTime = req.body.meetup_time || req.body.time || null;

    const sql = `
        SELECT c.id, c.item_id, c.user_one_id, c.user_two_id, c.agreement_status,
               c.meetup_barangay, c.meetup_date, c.meetup_time,
               ua.name AS user_one_name, ub.name AS user_two_name
        FROM conversations c
        JOIN users ua ON ua.id = c.user_one_id
        JOIN users ub ON ub.id = c.user_two_id
        WHERE c.id = ? AND (c.user_one_id = ? OR c.user_two_id = ?)
        LIMIT 1
    `;

    db.query(sql, [conversationId, currentUserId, currentUserId], (err, results) => {
        if (err) {
            console.error("Reschedule Lookup Error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const c = results[0];

        // Only makes sense once a meetup was actually on the books —
        // a conversation still at 'pending' has nothing to reschedule yet.
        const reschedulableStatuses = ['both_agreed', 'admin_reviewing', 'confirmed'];
        if (!reschedulableStatuses.includes(c.agreement_status)) {
            return res.status(400).json({
                success: false,
                message: "There's no scheduled meetup to reschedule yet."
            });
        }

        const isUserOne = Number(c.user_one_id) === Number(currentUserId);
        const requesterName = isUserOne ? c.user_one_name : c.user_two_name;
        const otherUserId = isUserOne ? c.user_two_id : c.user_one_id;

        const finalBarangay = newBarangayInput || c.meetup_barangay;
        if (!finalBarangay) {
            return res.status(400).json({
                success: false,
                message: "Please provide a barangay hall meetup location."
            });
        }

        const updateSql = `
            UPDATE conversations
            SET user_one_agreed = 0,
                user_two_agreed = 0,
                agreement_status = 'reschedule_requested',
                meetup_barangay = ?,
                meetup_date = ?,
                meetup_time = ?,
                admin_notified_at = NULL,
                transaction_report_path = NULL,
                updated_at = NOW()
            WHERE id = ?
        `;

        db.query(updateSql, [finalBarangay, newDate, newTime, conversationId], (updateErr) => {
            if (updateErr) {
                console.error("Reschedule Update Error:", updateErr);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            // Drop a visible notice into the chat itself, so the other party
            // sees why the agreement bar just reset instead of it looking
            // like a bug.
            const noticeText = reason
                ? `${requesterName} requested to reschedule the meetup: "${reason}". Both parties need to agree again.`
                : `${requesterName} requested to reschedule the meetup. Both parties need to agree again.`;

            db.query(
                `INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)`,
                [conversationId, currentUserId, noticeText],
                (msgErr) => { if (msgErr) console.error("Reschedule notice message insert failed:", msgErr); }
            );

            db.query(
                `INSERT INTO user_notifications (user_id, message, item_id, conversation_id) VALUES (?, ?, ?, ?)`,
                [otherUserId, `${requesterName} requested to reschedule your meetup for "${finalBarangay}". Please review and agree again.`, c.item_id, conversationId],
                (notifErr) => { if (notifErr) console.error("Reschedule notification insert failed:", notifErr); }
            );

            db.query(
                `INSERT INTO audit_logs (action, details) VALUES ('MEETUP_RESCHEDULE_REQUESTED', ?)`,
                [JSON.stringify({
                    conversationId, itemId: c.item_id, requestedBy: currentUserId,
                    reason, newBarangay: finalBarangay, newDate, newTime
                })],
                () => {}
            );

            res.json({
                success: true,
                status: 'reschedule_requested',
                barangay: finalBarangay,
                meetupDate: newDate,
                meetupTime: newTime
            });
        });
    });
});

/* =========================================================
   GET AGREEMENT STATUS / SUBMIT AGREEMENT (kept version, with meetup date+time)
   ========================================================= */

/*
    GET AGREEMENT STATUS
*/
app.get('/api/conversations/:conversationId/agreement', requireUser, (req, res) => {
    const currentUserId = req.session.userId;
    const conversationId = req.params.conversationId;

    const sql = `
        SELECT user_one_id, user_two_id, user_one_agreed, user_two_agreed,
               agreement_status, meetup_barangay, meetup_date, meetup_time, transaction_report_path
        FROM conversations
        WHERE id = ? AND (user_one_id = ? OR user_two_id = ?)
        LIMIT 1
    `;

    db.query(sql, [conversationId, currentUserId, currentUserId], (err, results) => {
        if (err) {
            console.error("Agreement Status Error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const c = results[0];
        const isUserOne = Number(c.user_one_id) === Number(currentUserId);
        const userAgreed = Boolean(isUserOne ? c.user_one_agreed : c.user_two_agreed);
        const otherUserAgreed = Boolean(isUserOne ? c.user_two_agreed : c.user_one_agreed);
        const totalAgreed = Number(c.user_one_agreed) + Number(c.user_two_agreed);

        res.json({
            success: true,
            userAgreed,
            otherUserAgreed,
            totalAgreed,
            status: c.agreement_status,
            barangay: c.meetup_barangay,
            meetupDate: c.meetup_date,
            meetupTime: c.meetup_time,
            transactionReportPath: c.transaction_report_path
        });
    });
});

/*
    SUBMIT AGREEMENT (Agree button -> confirm modal)
    Body: { agreed: true, barangay: "...", meetup_date: "YYYY-MM-DD", meetup_time: "HH:MM" }
*/
app.post('/api/conversations/:conversationId/agreement', requireUser, (req, res) => {
    const currentUserId = req.session.userId;
    const conversationId = req.params.conversationId;
    const barangayInput = typeof req.body.barangay === 'string' ? req.body.barangay.trim() : '';
    const meetupDateInput = req.body.meetup_date || req.body.date || null;
    const meetupTimeInput = req.body.meetup_time || req.body.time || null;

    const sql = `
        SELECT user_one_id, user_two_id, user_one_agreed, user_two_agreed,
               agreement_status, meetup_barangay, meetup_date, meetup_time
        FROM conversations
        WHERE id = ? AND (user_one_id = ? OR user_two_id = ?)
        LIMIT 1
    `;

    db.query(sql, [conversationId, currentUserId, currentUserId], (err, results) => {
        if (err) {
            console.error("Agreement Submit Lookup Error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const c = results[0];
        const isUserOne = Number(c.user_one_id) === Number(currentUserId);
        const alreadyAgreed = Boolean(isUserOne ? c.user_one_agreed : c.user_two_agreed);

        if (alreadyAgreed) {
            return res.json({
                success: true,
                userAgreed: true,
                otherUserAgreed: Boolean(isUserOne ? c.user_two_agreed : c.user_one_agreed),
                totalAgreed: Number(c.user_one_agreed) + Number(c.user_two_agreed),
                status: c.agreement_status
            });
        }

        const finalBarangay = c.meetup_barangay || barangayInput;
        const finalDate = c.meetup_date || meetupDateInput;
        const finalTime = c.meetup_time || meetupTimeInput;

        if (!finalBarangay) {
            return res.status(400).json({
                success: false,
                message: "Please choose a barangay hall meetup location before agreeing."
            });
        }

        const columnToSet = isUserOne ? 'user_one_agreed' : 'user_two_agreed';
        const updateSql = `
            UPDATE conversations
            SET ${columnToSet} = 1,
                meetup_barangay = ?,
                meetup_date = ?,
                meetup_time = ?,
                updated_at = NOW()
            WHERE id = ?
        `;

        db.query(updateSql, [finalBarangay, finalDate, finalTime, conversationId], (updateErr) => {
            if (updateErr) {
                console.error("Agreement Submit Update Error:", updateErr);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            const newUserOneAgreed = isUserOne ? 1 : c.user_one_agreed;
            const newUserTwoAgreed = isUserOne ? c.user_two_agreed : 1;
            const totalAgreed = Number(newUserOneAgreed) + Number(newUserTwoAgreed);
            const bothAgreed = totalAgreed >= 2;
            const newStatus = bothAgreed ? 'both_agreed' : 'pending';

            const finishUp = () => {
                res.json({
                    success: true,
                    userAgreed: true,
                    otherUserAgreed: bothAgreed,
                    totalAgreed,
                    status: newStatus,
                    barangay: finalBarangay,
                    meetupDate: finalDate,
                    meetupTime: finalTime
                });
            };

            if (bothAgreed) {
                db.query(
                    "UPDATE conversations SET agreement_status = 'both_agreed' WHERE id = ?",
                    [conversationId],
                    () => finishUp()
                );
            } else {
                finishUp();
            }
        });
    });
});

/* =========================================================
   ADMIN: REVIEW + CONFIRM TRANSACTION (auto-generates the PDF)
   ========================================================= */

/*
    LIST TRANSACTIONS AWAITING ADMIN REVIEW
*/
app.get('/api/admin/pending-transactions', requireAdmin, (req, res) => {
    const sql = `
        SELECT c.id AS conversation_id, c.item_id, c.meetup_barangay, c.meetup_date, c.meetup_time, 
               c.agreement_status, c.admin_notified_at, c.transaction_report_path,
               i.item_name, i.category, i.report_type, i.location, i.brand, i.image_path, i.user_id AS item_owner_id,
               i.incident_date, i.incident_time, i.description,
               ua.id AS user_one_id, ua.name AS user_one_name, ua.email AS user_one_email, ua.contact_number AS user_one_contact,
               ub.id AS user_two_id, ub.name AS user_two_name, ub.email AS user_two_email, ub.contact_number AS user_two_contact
        FROM conversations c
        JOIN items i ON i.id = c.item_id
        JOIN users ua ON ua.id = c.user_one_id
        JOIN users ub ON ub.id = c.user_two_id
        WHERE c.agreement_status IN ('both_agreed', 'admin_reviewing', 'confirmed', 'disputed')
        ORDER BY c.admin_notified_at IS NULL, c.admin_notified_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Pending Transactions Error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, transactions: results });
    });
});

/*
    ADMIN: VIEW THE CHAT TRANSCRIPT FOR A CONVERSATION (read-only review)
*/
app.get('/api/admin/conversations/:conversationId/messages', requireAdmin, (req, res) => {
    const conversationId = req.params.conversationId;

    const sql = `
        SELECT m.id, m.sender_id, m.message, m.message_type, m.image_url, m.is_sensitive, m.created_at,
               u.name AS sender_name
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
    `;
    db.query(sql, [conversationId], (err, results) => {
        if (err) {
            console.error("Admin Transcript Error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, messages: results });
    });
});

/*
    ADMIN: FLAG A TRANSACTION AS DISPUTED
*/
app.post('/api/admin/transactions/:conversationId/dispute', requireAdmin, (req, res) => {
    const conversationId = req.params.conversationId;
    const reason = (req.body.reason || '').trim() || 'No reason provided.';

    const sql = `
        SELECT c.*, i.item_name FROM conversations c
        JOIN items i ON i.id = c.item_id
        WHERE c.id = ? LIMIT 1
    `;
    db.query(sql, [conversationId], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "Database error." });
        if (results.length === 0) return res.status(404).json({ success: false, message: "Conversation not found." });

        const c = results[0];

        db.query(
            "UPDATE conversations SET agreement_status = 'disputed' WHERE id = ?",
            [conversationId],
            (updateErr) => {
                if (updateErr) return res.status(500).json({ success: false, message: "Database error." });

                const notifMsg = `Your ReFoundly transaction for "${c.item_name}" was flagged for admin review: ${reason}`;
                db.query(
                    `INSERT INTO user_notifications (user_id, message, item_id, conversation_id) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
                    [c.user_one_id, notifMsg, c.item_id, conversationId, c.user_two_id, notifMsg, c.item_id, conversationId],
                    () => {}
                );

                db.query(
                    `INSERT INTO audit_logs (action, details) VALUES ('TRANSACTION_DISPUTED', ?)`,
                    [JSON.stringify({ conversationId, itemId: c.item_id, reason })],
                    () => {}
                );

                res.json({ success: true, status: 'disputed' });
            }
        );
    });
});

/*
    ADMIN CONFIRM -> auto-generate the transaction PDF, notify both users
*/
app.post('/api/admin/transactions/:conversationId/confirm', requireAdmin, (req, res) => {
    const conversationId = req.params.conversationId;
    const adminId = req.session.admin.id;

    const sql = `
        SELECT c.*, i.item_name, i.category, i.report_type, i.location, i.user_id AS item_owner_id,
               i.incident_date, i.incident_time, i.description, i.brand,
               ua.name AS user_one_name, ua.contact_number AS user_one_contact,
               ub.name AS user_two_name, ub.contact_number AS user_two_contact
        FROM conversations c
        JOIN items i ON i.id = c.item_id
        JOIN users ua ON ua.id = c.user_one_id
        JOIN users ub ON ub.id = c.user_two_id
        WHERE c.id = ?
        LIMIT 1
    `;

    db.query(sql, [conversationId], (err, results) => {
        if (err) {
            console.error("Admin Confirm Lookup Error:", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const c = results[0];
        if (Number(c.user_one_agreed) + Number(c.user_two_agreed) < 2) {
            return res.status(400).json({ success: false, message: "Both parties have not agreed yet." });
        }

        const reportsDir = path.join(__dirname, 'User', 'uploads', 'reports');
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

        const fileName = `transaction_${conversationId}_${Date.now()}.pdf`;
        const filePath = path.join(reportsDir, fileName);
        const publicPath = `/uploads/reports/${fileName}`;

        try {
            const doc = new PDFDocument({ margin: 60 });
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // MySQL DATE columns come back as JS Date objects — format them
            // properly instead of letting pdfkit call .toString() on them
            // (which produces "Fri Aug 21 2026 00:00:00 GMT+0800 (...)").
            const formatNiceDate = (value) => {
                if (!value) return 'N/A';
                const d = new Date(value);
                if (isNaN(d.getTime())) return String(value);
                return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            };

            // MySQL TIME columns come back as "HH:MM:SS" (military time).
            // Convert to a plain 12-hour "h:mm AM/PM" format for the letter.
            const formatNiceTime = (value) => {
                if (!value) return null;
                const match = String(value).match(/^(\d{1,2}):(\d{2})/);
                if (!match) return String(value);
                let hours = parseInt(match[1], 10);
                const minutes = match[2];
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                return `${hours}:${minutes} ${ampm}`;
            };

            const pageWidth = 480;
            const adminName = (req.session.admin && req.session.admin.name) || 'ReFoundly Admin';
            const todayFormatted = formatNiceDate(new Date());
            const barangayName = c.meetup_barangay || 'the designated Barangay Hall';

            // Whoever posted the item is either the Finder (if they posted to
            // "Found") or the Owner (if they posted to "Lost"). The other
            // person in the conversation is the opposite role.
            const posterIsUserOne = Number(c.item_owner_id) === Number(c.user_one_id);
            const posterName = posterIsUserOne ? c.user_one_name : c.user_two_name;
            const posterContact = posterIsUserOne ? c.user_one_contact : c.user_two_contact;
            const otherName = posterIsUserOne ? c.user_two_name : c.user_one_name;
            const otherContact = posterIsUserOne ? c.user_two_contact : c.user_one_contact;
            const isFoundReport = (c.report_type || '').toLowerCase() === 'found';
            const posterRole = isFoundReport ? 'Finder' : 'Owner (Lost the Item)';
            const otherRole = isFoundReport ? 'Owner (Lost the Item)' : 'Finder';

            const formattedIncidentDate = formatNiceDate(c.incident_date);
            const formattedMeetupDate = formatNiceDate(c.meetup_date);
            const formattedIncidentTime = formatNiceTime(c.incident_time);
            const formattedMeetupTime = formatNiceTime(c.meetup_time);

            // --- Letterhead ---
            doc.fontSize(16).font('Helvetica-Bold').fillColor('#5D8252').text('ReFoundly', { align: 'left' });
            doc.fontSize(9).font('Helvetica').fillColor('#666')
                .text('Digital Lost & Found Portal  ·  refoundly@gmail.com  ·  +63 912 345 6789');
            doc.moveDown(0.3);
            doc.moveTo(60, doc.y).lineTo(60 + pageWidth, doc.y).strokeColor('#ddd').stroke();
            doc.moveDown(1.5);

            // --- Date ---
            doc.fontSize(11).fillColor('#000').font('Helvetica').text(todayFormatted);
            doc.moveDown(1.2);

            // --- Addressee ---
            doc.text('The Barangay Captain');
            doc.text(barangayName);
            doc.moveDown(1.2);

            // --- Subject ---
            doc.font('Helvetica-Bold').text('Re: Endorsement for Use of Barangay Hall — Lost and Found Item Handover');
            doc.font('Helvetica');
            doc.moveDown(1);

            // --- Salutation ---
            doc.text('Dear Sir/Madam,');
            doc.moveDown(0.8);

            // --- Body: intro / request ---
            doc.text(
                `This letter is to formally inform your office that two verified users of the ReFoundly digital ` +
                `lost-and-found platform have mutually agreed, through our platform's messaging system and following ` +
                `admin verification, to meet at ${barangayName} to complete the handover of the item described below. ` +
                `We respectfully request permission to use your barangay hall as the venue for this meeting and, if ` +
                `possible, the presence of a barangay official during the handover to ensure the safety of both parties.`,
                { align: 'justify', width: pageWidth }
            );
            doc.moveDown(1.2);

            // --- Item Details ---
            doc.font('Helvetica-Bold').text('Item Details');
            doc.font('Helvetica').moveDown(0.3);
            doc.text(`Item Name: ${c.item_name || 'N/A'}`);
            doc.text(`Category: ${c.category || 'N/A'}`);
            doc.text(`Brand: ${c.brand || 'N/A'}`);
            doc.text(`Report Type: ${c.report_type || 'N/A'}`);
            doc.text(`Location Reported: ${c.location || 'N/A'}`);
            doc.text(`Date and Time Reported: ${formattedIncidentDate}${formattedIncidentTime ? ' at ' + formattedIncidentTime : ''}`);
            doc.moveDown(0.5);
            doc.text('Description:');
            doc.text(c.description || 'N/A', { width: pageWidth, align: 'justify' });
            doc.moveDown(1.2);

            // --- Parties Involved ---
            doc.font('Helvetica-Bold').text('Parties Involved');
            doc.font('Helvetica').moveDown(0.3);
            doc.text(`${posterRole}: ${posterName || 'N/A'}  —  Contact: ${posterContact || 'N/A'}`);
            doc.text(`${otherRole}: ${otherName || 'N/A'}  —  Contact: ${otherContact || 'N/A'}`);
            doc.moveDown(1.2);

            // --- Scheduled Meetup ---
            doc.font('Helvetica-Bold').text('Scheduled Meetup');
            doc.font('Helvetica').moveDown(0.3);
            doc.text(`Venue: ${barangayName}`);
            doc.text(`Date: ${formattedMeetupDate}`);
            doc.text(`Time: ${formattedMeetupTime || 'To be arranged'}`);
            doc.moveDown(1.2);

            // --- Closing ---
            doc.text(
                `Both parties have formally confirmed through the ReFoundly platform their agreement to proceed with the ` +
                `handover of the item at the venue and on the schedule indicated above. This agreement has been reviewed and ` +
                `verified by the ReFoundly Administration prior to the issuance of this letter. Should your office require any ` +
                `further verification or clarification, please do not hesitate to contact us using the contact information ` +
                `provided above.`,
                { align: 'justify', width: pageWidth }
            );
            doc.moveDown(1);
            doc.text('Thank you for your cooperation and support in facilitating safe community handovers.');
            doc.moveDown(2);

            // --- Signature block ---
            doc.text('Respectfully yours,');
            doc.moveDown(2.5);
            doc.text('_______________________________');
            doc.font('Helvetica-Bold').text(adminName);
            doc.font('Helvetica').fontSize(10).fillColor('#555').text('ReFoundly Verification Team');
            doc.moveDown(1.5);

            // --- Footer note ---
            doc.fontSize(8).fillColor('#999').text(
                `This letter was system-generated by ReFoundly following in-app verification of both parties' ` +
                `agreement. Reference: Agreement #AGR-${conversationId} · Generated ${new Date().toLocaleString()}`,
                { width: pageWidth }
            );

            doc.end();

            stream.on('finish', () => {
                db.query(
                    `UPDATE conversations
                     SET agreement_status = 'confirmed',
                         transaction_report_path = ?,
                         admin_confirmed_by = ?
                     WHERE id = ?`,
                    [publicPath, adminId, conversationId],
                    (updateErr) => {
                        if (updateErr) {
                            console.error("Admin Confirm Update Error:", updateErr);
                            return res.status(500).json({ success: false, message: "Database error." });
                        }

                        const notifMsg = `Your ReFoundly transaction for "${c.item_name}" has been confirmed. View the report in your chat.`;
                        db.query(
                            `INSERT INTO user_notifications (user_id, message, item_id, conversation_id) VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
                            [c.user_one_id, notifMsg, c.item_id, conversationId, c.user_two_id, notifMsg, c.item_id, conversationId],
                            () => {}
                        );

                        db.query(
                            `INSERT INTO audit_logs (action, details) VALUES ('TRANSACTION_CONFIRMED', ?)`,
                            [JSON.stringify({ conversationId, itemId: c.item_id, reportPath: publicPath })],
                            () => {}
                        );

                        res.json({ success: true, reportPath: publicPath });
                    }
                );
            });
        } catch (pdfErr) {
            console.error("PDF Generation Error:", pdfErr);
            res.status(500).json({ success: false, message: "Failed to generate PDF report." });
        }
    });
});

/*--Global Error Handler--*/
app.use((err, req, res, next) => {
    console.error("❌ Express Server Error:", err.stack || err.message);
    res.status(500).json({
        success: false,
        message: err.message || "Server error occurred during request."
    });
});

/*--Protected Page Routes--*/
app.get('/dashboard.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'dashboard.html')));
app.get('/report.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'report.html')));
app.get('/user_acc.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'user_acc.html')));
app.get('/history.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'history.html')));
app.get('/message.html', requireUser, (req, res) => res.sendFile(path.join(__dirname, 'User', 'message.html')));

app.get('/AdHome.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'User', 'AdHome.html')));
app.get('/AdReport.html', requireAdmin, (req, res) => res.sendFile(path.join(__dirname, 'User', 'AdReport.html')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'User', 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'User', 'index.html')));

/*--Static Files Middleware--*/
app.use(express.static(path.join(__dirname, 'User')));
app.use('/uploads', express.static(path.join(__dirname, 'User', 'uploads')));

/*--Start Server--*/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});