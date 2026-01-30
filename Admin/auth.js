const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

// LOGIN
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM admins WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Server error' });

        if (results.length === 0) {
            return res.json({ success: false, message: 'Wrong username or password' });
        }

        const admin = results[0];
        const match = await bcrypt.compare(password, admin.password);

        if (!match) {
            return res.json({ success: false, message: 'Wrong username or password' });
        }

        req.session.admin = {
            id: admin.id,
            name: admin.name,
            email: admin.email
        };

        res.json({ success: true });
    });
});

// LOGOUT
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

module.exports = router;
