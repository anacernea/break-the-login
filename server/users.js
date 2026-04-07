const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // Get all users
    router.get("/users", (_req, res) => {
        db.all(
            `SELECT id, email, role, locked, created_at FROM users`,
            [],
            (err, rows) => {
                if (err) return res.status(500).json({ error: "Internal server error" });
                res.status(200).json(rows);
            }
        );
    });

    // Get user by id
    router.get("/users/:id", (req, res) => {
        db.get(
            `SELECT id, email, role, locked, created_at FROM users WHERE id = ?`,
            [req.params.id],
            (err, row) => {
                if (err) return res.status(500).json({ error: "Internal server error" });
                if (!row) return res.status(404).json({ error: "User not found" });
                res.status(200).json(row);
            }
        );
    });

    return router;
};
