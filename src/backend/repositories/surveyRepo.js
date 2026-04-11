const db = require('../database/sqlite-setup');

class MoodLogRepository {
    insertMoodLog(moodData) {
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO mood_logs (apm, computed_mood, source) VALUES (?, ?, ?)`;
            
            db.run(query, [moodData.apm, moodData.computed_mood, moodData.source], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...moodData });
                }
            });
        });
    }

    getLatestMood() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, apm, computed_mood, source, timestamp
                FROM mood_logs
                ORDER BY id DESC
                LIMIT 1
            `;

            db.get(query, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }
}

module.exports = new MoodLogRepository();
