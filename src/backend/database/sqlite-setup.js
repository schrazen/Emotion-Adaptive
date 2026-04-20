const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const databaseRoot = process.env.EAUIS_DATA_DIR || path.resolve(__dirname);
fs.mkdirSync(databaseRoot, { recursive: true });

// Initialize database
const dbPath = path.join(databaseRoot, 'eauis.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        db.run(`CREATE TABLE IF NOT EXISTS mood_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            apm INTEGER NOT NULL,
            computed_mood TEXT,
            source TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

module.exports = db;
