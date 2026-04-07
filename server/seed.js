const bcrypt = require('bcrypt');

async function seedDatabase(db) {

	initializeSchema(db);
	const users = await seedUsers(db);
	console.log("Database seeding complete!");
	console.log(`Users: ${users.length}`);
	return { users };
}

function initializeSchema(db) {
	db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL DEFAULT 'user',
			locked BOOLEAN,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS tickets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT,
			severity TEXT,
			status TEXT,
			owner_id INTEGER NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP,
			FOREIGN KEY (owner_id) REFERENCES users(id)
		);

		CREATE TABLE IF NOT EXISTS audit_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER,
			action TEXT NOT NULL,
			resource TEXT,
			resource_id TEXT,
			ip_address TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);
	`);
	console.log("Tables created!");
}

async function seedUsers(db) {

	const insertUser = db.prepare(`
		INSERT INTO users (email, password_hash, role)
		VALUES (?, ?, ?)
	`);

	insertUser.run(
		"user@gmail.com",
		await bcrypt.hash("user", 10),
		"user"
	);

	insertUser.finalize();

	const allUsers = await new Promise((resolve, reject) => {
		db.all(`SELECT * FROM users`, (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});

	console.log("Users generated!");

	return allUsers;
}


module.exports = { seedDatabase };
