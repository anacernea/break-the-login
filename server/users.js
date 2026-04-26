const express = require('express');
const crypto = require('crypto');

const resetTokens = {}; 

function generateToken(email) {
    return crypto.createHash('md5').update(email).digest('hex');
}

module.exports = (db, requireAuth) => {
    const router = express.Router();

    //get all users
    router.get("/users", requireAuth, (_req, res) => {
        db.all(
            `SELECT id, email, role, locked, created_at FROM users`,
            [],
            (err, rows) => {
                if (err) return res.status(500).json({ error: "Internal server error" });
                res.status(200).json(rows);
            }
        );
    });

    //get user by id
    router.get("/users/:id", requireAuth, (req, res) => {
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

    //get current user (after login)
    router.get("/user", requireAuth, (req, res) => {
        db.get(
            `SELECT id, email, role FROM users WHERE id = ?`,
            [req.session.userId],
            (err, row) => {
                if (err) return res.status(500).json({ error: "Internal server error" });
                if (!row) return res.status(404).json({ error: "User not found" });
                res.status(200).json({ id: row.id, email: row.email, role: row.role });
            }
        );
    });

    //register
    router.post("/users", (req, res) => {
        const { email, password } = req.body;

        db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) return res.status(500).json({ error: "Internal server error" });
            if (row) return res.status(409).json({ error: "Email already in use" });

            db.run(
                `INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'user')`,
                [email, password],
                function (err) {
                    if (err) return res.status(500).json({ error: "Internal server error" });
                    res.status(201).json({ id: this.lastID, email });
                }
            );
        });
    });

    //login
    router.post("/login", async (req, res) => {
        const { email, password } = req.body;

        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {

            if (err) return res.status(500).json({ error: "Internal server error" });
            if (!row) return res.status(401).json({ error: "Invalid email" });
            if (password !== row.password_hash) return res.status(401).json({ error: "Invalid password" });
            req.session.userId = row.id;
            res.status(200).json({ id: row.id, email: row.email, role: row.role });
        });
    });

    //logout
    router.post("/logout", requireAuth, (req, res) => {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ error: "Internal server error" });
            res.status(200).json({ message: "Logout successful" });
        });
    });

    //forgot password - generates predictable token and prints link to terminal
    router.post("/forgot-password", (req, res) => {
        const { email } = req.body;

        db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) return res.status(500).json({ error: "Internal server error" });
            if (!row) return res.status(404).json({ error: "Invalid email" });

            const token = generateToken(email);
            resetTokens[token] = email;

            console.log(`\n[RESET LINK] http://localhost:5173/reset-password?token=${token}\n`);

            res.status(200).json({ message: "Reset link sent" });
        });
    });

    //reset password - token is reusable (no expiry)
    router.post("/reset-password", (req, res) => {
        const { token, password } = req.body;

        const email = resetTokens[token];
        if (!email) return res.status(400).json({ error: "Invalid token" });

        db.run(
            `UPDATE users SET password_hash = ? WHERE email = ?`,
            [password, email],
            function (err) {
                if (err) return res.status(500).json({ error: "Internal server error" });
                res.status(200).json({ message: "Password updated" });
            }
        );
    });

    return router;
};
