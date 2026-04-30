const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

const DUMMY_HASH = bcrypt.hash('timing-protection-break-the-login', SALT_ROUNDS);

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MAX_IP_ATTEMPTS = 10;
const IP_WINDOW_MS = 15 * 60 * 1000;

const ipAttempts = new Map();

function isIpBlocked(ip) {
    const entry = ipAttempts.get(ip);
    if (!entry || Date.now() > entry.resetAt) return false;
    return entry.count >= MAX_IP_ATTEMPTS;
}

function recordIpAttempt(ip) {
    const now = Date.now();
    const entry = ipAttempts.get(ip);
    if (!entry || now > entry.resetAt) {
        ipAttempts.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    } else {
        entry.count++;
    }
}

function resetIpAttempts(ip) {
    ipAttempts.delete(ip);
}

const resetTokens = {};

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

const TOKEN_EXPIRY_MS = 15 * 60 * 1000;

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
            `SELECT * FROM users`,
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

        if (isIpBlocked(ip)) {
            logAuthAudit(null, 'LOGIN_RATE_LIMITED_IP', ip);
            return res.status(429).json({ error: "Too many login attempts. Please try again later." });
        }

        const dummyHash = await DUMMY_HASH;

        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) return res.status(500).json({ error: "Internal server error" });

            if (row && row.locked_until && new Date(row.locked_until) > new Date()) {
                recordIpAttempt(ip);
                logAuthAudit(row.id, 'LOGIN_ACCOUNT_LOCKED', ip);
                return res.status(429).json({ error: "Account temporarily locked. Please try again later." });
            }

            const hash = row ? row.password_hash : dummyHash;

            bcrypt.compare(password, hash).then((match) => {
                if (!row || !match) {
                    recordIpAttempt(ip);

                    if (row) {
                        const newCount = (row.failed_attempts || 0) + 1;
                        if (newCount >= MAX_FAILED_ATTEMPTS) {
                            const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
                            db.run(`UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?`,
                                [newCount, lockedUntil, row.id]);
                            logAuthAudit(row.id, 'LOGIN_ACCOUNT_LOCKED', ip);
                        } else {
                            db.run(`UPDATE users SET failed_attempts = ? WHERE id = ?`, [newCount, row.id]);
                            logAuthAudit(row.id, 'LOGIN_FAILED', ip);
                        }
                    } else {
                        logAuthAudit(null, 'LOGIN_FAILED', ip);
                    }

                    return res.status(401).json({ error: "Invalid credentials" });
                }

                resetIpAttempts(ip);
                db.run(`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?`, [row.id]);
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

    //forgot password 
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

            const token = generateToken();
            resetTokens[token] = { email, expiresAt: Date.now() + TOKEN_EXPIRY_MS };

            logAuthAudit(row.id, 'PASSWORD_RESET_REQUEST_SUCCESS', ip);
            console.log(`\n[RESET LINK] http://localhost:5173/reset-password?token=${token}\n`);

            res.status(200).json(genericResponse);
        });
    });

    //reset password 
    router.post("/reset-password", (req, res) => {
        const { token, password } = req.body;
        const ip = req.ip;

        const tokenData = resetTokens[token];
        if (!tokenData || Date.now() > tokenData.expiresAt) {
            delete resetTokens[token];
            logAuthAudit(null, 'PASSWORD_RESET_FAILED', ip);
            return res.status(400).json({ error: "Invalid or expired token" });
        }
        const email = tokenData.email;

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
                        delete resetTokens[token];
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
