const express = require("express");
const router = express.Router();
const db = require("../Admin/db");

router.get("/all", (req, res) => {
    const sql = `
        SELECT id, name, email, 'admin' AS role, created_at
        FROM admins

        UNION ALL

        SELECT id, name, email, 'user' AS role, created_at
        FROM users

        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(results);
    });
});

module.exports = router;
