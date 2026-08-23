const express = require("express");
const router = express.Router();
const db = require("../Admin/db");

// GET /api/admin-users/all
router.get("/all", (req, res) => {
    const sql = `
        SELECT id, name, email, 'admin' AS role, status, suspend_reasons, suspended_until, created_at 
        FROM admins
        UNION ALL
        SELECT id, name, email, 'user' AS role, status, suspend_reasons, suspended_until, created_at 
        FROM users
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Database query failed", details: err.message });
        res.json(results);
    });
});

// admins and users each have their own auto-incrementing id, so ids can
// collide across the two tables. role tells us which table to hit —
// never guess by trying one table then falling back to the other.
function tableForRole(role) {
    return role === "admin" ? "admins" : "users";
}

// POST /api/admin-users/status-toggle/:id
// Body: { status: 'active' | 'deactivated', role: 'admin' | 'user', actionSource }
router.post("/status-toggle/:id", (req, res) => {
    const { id } = req.params;
    const { status, role } = req.body;

    if (!status) {
        return res.status(400).json({ success: false, message: "Missing status value" });
    }
    if (!role) {
        return res.status(400).json({ success: false, message: "Missing role — cannot determine which table to update" });
    }

    const table = tableForRole(role);
    const sql = `UPDATE ${table} SET status = ? WHERE id = ?`;

    db.query(sql, [status, id], (err, result) => {
        if (err) {
            console.error(`DATABASE ERROR (status-toggle/${table}):`, err.message);
            return res.status(500).json({ success: false, message: "Database error", details: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: `Status updated to ${status}` });
    });
});

// POST /api/admin-users/suspend/:id
// Body: { reasons: string[], role: 'admin' | 'user', durationDays: number }
// POST /api/admin-users/suspend/:id
router.post('/suspend/:id', (req, res) => {
    const userId = req.params.id;
    const { reasons, role, durationDays } = req.body;

    const days = parseInt(durationDays) || 7;
    const suspendedUntilDate = new Date();
    suspendedUntilDate.setDate(suspendedUntilDate.getDate() + days);

    // Format to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
    const formattedDate = suspendedUntilDate.toISOString().slice(0, 19).replace('T', ' ');

    const reasonsJson = JSON.stringify(reasons || []);
    const tableName = (role && role.toLowerCase() === 'admin') ? 'admins' : 'users';

    const sql = `
        UPDATE ${tableName} 
        SET status = 'suspended',
            is_suspended = 1,
            suspend_reasons = ?,
            suspended_until = ?
        WHERE id = ?
    `;

    db.query(sql, [reasonsJson, formattedDate, userId], (err, result) => {
        if (err) {
            console.error('Suspension DB Error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        return res.json({ 
            success: true, 
            message: `Account suspended successfully for ${days} day(s).` 
        });
    });
});

// POST /api/admin-users/unsuspend/:id
router.post("/unsuspend/:id", (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
        return res.status(400).json({ success: false, message: "Missing role" });
    }

    const table = tableForRole(role);
    const sql = `UPDATE ${table} SET status = 'active', suspend_reasons = NULL, suspended_until = NULL WHERE id = ?`;

    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        res.json({ success: true, message: "Suspension lifted" });
    });
});


module.exports = router;
