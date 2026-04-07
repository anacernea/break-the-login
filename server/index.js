const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { seedDatabase } = require('./seed');

const app = express();
const PORT = 3000;

const db = new sqlite3.Database(':memory:');

seedDatabase(db);

app.use(express.json());

const userRoutes = require('./users');
app.use('/api', userRoutes(db));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
