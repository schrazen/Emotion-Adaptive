const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database
const dbPath = path.resolve(__dirname, 'eauis.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Define tables here
        db.run(`CREATE TABLE IF NOT EXISTS surveys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rating INTEGER NOT NULL,
            mood_state TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS mood_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            apm INTEGER NOT NULL,
            computed_mood TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

module.exports = db;
