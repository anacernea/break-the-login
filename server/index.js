const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const { seedDatabase } = require('./seed');

const app = express();
const PORT = 3000;

const db = new sqlite3.Database('./database.db');

seedDatabase(db);

app.use(express.json());
app.use(session({
    secret: 'secret-key-break-the-login',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ message: "Not authenticated" });
    }
};


const userRoutes = require('./routes');
app.use('/api', userRoutes(db, requireAuth));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
