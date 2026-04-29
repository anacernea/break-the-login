const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

const DUMMY_HASH = bcrypt.hash('timing-protection-break-the-login', SALT_ROUNDS);

const resetTokens = {};

function generateToken(email) {
    return crypto.createHash('md5').update(email).digest('hex');
}

module.exports = (db, requireAuth) => {
    const router = express.Router();

    function logAuthAudit(userId, action, ip) {
        db.run(
            `INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address) VALUES (?, ?, 'auth', NULL, ?)`,
            [userId || null, action, ip || null],
            (err) => {
                if (err) {
                    console.error("Audit log failed:", err.message);
                }
            }
        );
    }

    //get all audit logs
    router.get("/audit-logs", (_req, res) => {
        db.all(
            `SELECT * FROM audit_logs`,
            [],
            (err, rows) => {
                if (err) return res.status(500).json({ error: "Internal server error" });
                res.status(200).json(rows);
            }
        );
    });


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
        const ip = req.ip;

        if (!password || password.length < 8) {
            logAuthAudit(null, 'REGISTER_FAILED', ip);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        //cel putin o litera mica, mare si o cifra
        const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
        if (!complexityRegex.test(password)) {
            logAuthAudit(null, 'REGISTER_FAILED', ip);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const genericResponse = { message: "If this email is not registered, your account has been created." };

        db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) {
                logAuthAudit(null, 'REGISTER_FAILED', ip);
                return res.status(500).json({ error: "Internal server error" });
            }
            if (row) {
                logAuthAudit(null, 'REGISTER_FAILED_EMAIL_EXISTS', ip);
                return res.status(200).json(genericResponse);
            }

            bcrypt.hash(password, SALT_ROUNDS).then((hash) => {
                db.run(
                    `INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'user')`,
                    [email, hash],
                    function (err) {
                        if (err) {
                            logAuthAudit(null, 'REGISTER_FAILED', ip);
                            return res.status(500).json({ error: "Internal server error" });
                        }
                        logAuthAudit(this.lastID, 'REGISTER_SUCCESS', ip);
                        res.status(200).json(genericResponse);
                    }
                );
            }).catch(() => {
                logAuthAudit(null, 'REGISTER_FAILED', ip);
                res.status(500).json({ error: "Internal server error" });
            });
        });
    });

    //login
    router.post("/login", async (req, res) => {
        const { email, password } = req.body;
        const ip = req.ip;

        const dummyHash = await DUMMY_HASH;

        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) return res.status(500).json({ error: "Internal server error" });

            const hash = row ? row.password_hash : dummyHash;

            bcrypt.compare(password, hash).then((match) => {
                if (!row || !match) {
                    logAuthAudit(row ? row.id : null, 'LOGIN_FAILED', ip);
                    return res.status(401).json({ error: "Invalid credentials" });
                }
                req.session.userId = row.id;
                logAuthAudit(row.id, 'LOGIN_SUCCESS', ip);
                logAuthAudit(row.id, 'SESSION_CREATED', ip);
                res.status(200).json({ id: row.id, email: row.email, role: row.role });
            }).catch(() => res.status(500).json({ error: "Internal server error" }));
        });
    });

    //logout
    router.post("/logout", requireAuth, (req, res) => {
        const userId = req.session.userId;
        const ip = req.ip;
        req.session.destroy((err) => {
            if (err) {
                logAuthAudit(null, 'LOGOUT_FAILED', ip);
                return res.status(500).json({ error: "Internal server error" });
            }
            logAuthAudit(userId, 'LOGOUT_SUCCESS', ip);
            logAuthAudit(userId, 'SESSION_INVALIDATED', ip);
            res.status(200).json({ message: "Logout successful" });
        });
    });

    //forgot password - generates predictable token and prints link to terminal
    router.post("/forgot-password", (req, res) => {
        const { email } = req.body;
        const ip = req.ip;

        const genericResponse = { message: "If an account with this email exists, a reset link has been sent." };

        db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) {
                logAuthAudit(null, 'SERVER_ERROR', ip);
                return res.status(500).json({ error: "Internal server error" });
            }
            if (!row) {
                logAuthAudit(null, 'PASSWORD_RESET_REQUEST_FAILED', ip);
                return res.status(200).json(genericResponse);
            }

            const token = generateToken(email);
            resetTokens[token] = email;

            logAuthAudit(row.id, 'PASSWORD_RESET_REQUEST_SUCCESS', ip);
            console.log(`\n[RESET LINK] http://localhost:5173/reset-password?token=${token}\n`);

            res.status(200).json(genericResponse);
        });
    });

    //reset password - token is reusable (no expiry)
    router.post("/reset-password", (req, res) => {
        const { token, password } = req.body;
        const ip = req.ip;

        const email = resetTokens[token];
        if (!email) {
            logAuthAudit(null, 'PASSWORD_RESET_FAILED', ip);
            return res.status(400).json({ error: "Invalid token" });
        }

        if (!password || password.length < 8) {
            logAuthAudit(null, 'PASSWORD_RESET_FAILED', ip);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
        if (!complexityRegex.test(password)) {
            logAuthAudit(null, 'PASSWORD_RESET_FAILED', ip);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) {
                logAuthAudit(null, 'SERVER_ERROR', ip);
                return res.status(500).json({ error: "Internal server error" });
            }

            bcrypt.hash(password, SALT_ROUNDS).then((hash) => {
                db.run(
                    `UPDATE users SET password_hash = ? WHERE email = ?`,
                    [hash, email],
                    function (err) {
                        if (err) {
                            logAuthAudit(row ? row.id : null, 'PASSWORD_RESET_FAILED', ip);
                            return res.status(500).json({ error: "Internal server error" });
                        }
                        logAuthAudit(row ? row.id : null, 'PASSWORD_RESET_SUCCESS', ip);
                        res.status(200).json({ message: "Password updated" });
                    }
                );
            }).catch(() => {
                logAuthAudit(row ? row.id : null, 'PASSWORD_RESET_FAILED', ip);
                res.status(500).json({ error: "Internal server error" });
            });
        });
    });

    return router;
};
