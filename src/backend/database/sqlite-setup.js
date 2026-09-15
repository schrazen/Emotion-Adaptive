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

        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS mood_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                apm INTEGER NOT NULL,
                computed_mood TEXT,
                source TEXT,
                session_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`ALTER TABLE mood_logs ADD COLUMN session_id TEXT`, (alterErr) => {
                if (!alterErr) {
                    return;
                }

                if (!String(alterErr.message || '').includes('duplicate column name')) {
                    console.error('Failed to ensure session_id column on mood_logs:', alterErr.message);
                }
            });

            // Detailed signal logging table for accuracy analysis
            db.run(`CREATE TABLE IF NOT EXISTS mood_signal_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mood_log_id INTEGER,
                error_rate REAL,
                burst_apm INTEGER,
                baseline_apm INTEGER,
                instability INTEGER,
                backspace_burst_count INTEGER,
                frustration_text_score REAL,
                frustration_text_matches TEXT,
                joy_active BOOLEAN,
                is_frustrated_by_text BOOLEAN,
                is_frustrated_by_speed BOOLEAN,
                anger_level REAL,
                joy_level REAL,
                context_app TEXT,
                session_duration_minutes REAL,
                hour_of_day INTEGER,
                is_circadian_adjusted BOOLEAN,
                signals_json TEXT,
                user_feedback TEXT,
                feedback_timestamp DATETIME,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(mood_log_id) REFERENCES mood_logs(id)
            )`);

            db.run(`CREATE INDEX IF NOT EXISTS idx_mood_signal_mood_log_id ON mood_signal_logs(mood_log_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_mood_signal_timestamp ON mood_signal_logs(timestamp)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_mood_signal_context ON mood_signal_logs(context_app)`);
        });
    }
});

module.exports = db;
