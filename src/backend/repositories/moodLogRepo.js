const db = require('../database/sqlite-setup');

const DEFAULT_SESSION_GAP_MINUTES = 30;

function parseTimestampMs(timestamp) {
    const value = Date.parse(timestamp);
    return Number.isNaN(value) ? null : value;
}

function getDominantMood(rows) {
    const counts = new Map();
    let dominantMood = 'Neutral';
    let dominantCount = -1;

    rows.forEach((row) => {
        const mood = row.computed_mood || 'Neutral';
        const nextCount = (counts.get(mood) || 0) + 1;
        counts.set(mood, nextCount);

        if (nextCount > dominantCount) {
            dominantMood = mood;
            dominantCount = nextCount;
            return;
        }

        if (nextCount === dominantCount) {
            const currentPriority = mood === 'Angry' ? 3 : mood === 'Happy' ? 2 : 1;
            const dominantPriority = dominantMood === 'Angry' ? 3 : dominantMood === 'Happy' ? 2 : 1;
            if (currentPriority > dominantPriority) {
                dominantMood = mood;
            }
        }
    });

    return dominantMood;
}

function buildSessionSummary(rows, previousAverageApm = null) {
    const apmSum = rows.reduce((sum, row) => sum + (Number(row.apm) || 0), 0);
    const averageApm = rows.length > 0 ? apmSum / rows.length : 0;
    const dominantMood = getDominantMood(rows);
    const startTimestamp = rows[0]?.timestamp || null;
    const endTimestamp = rows[rows.length - 1]?.timestamp || null;
    const triggerCount = rows.length;

    let apmDifferencePercent = null;
    if (typeof previousAverageApm === 'number' && previousAverageApm > 0) {
        apmDifferencePercent = ((averageApm - previousAverageApm) / previousAverageApm) * 100;
    }

    return {
        startTimestamp,
        endTimestamp,
        triggerCount,
        mainState: dominantMood,
        dominantMood,
        averageApm: Number(averageApm.toFixed(2)),
        apmDifferencePercent: apmDifferencePercent == null ? null : Number(apmDifferencePercent.toFixed(2)),
    };
}

class MoodLogRepository {
    insertMoodLog(moodData) {
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO mood_logs (apm, computed_mood, source, session_id) VALUES (?, ?, ?, ?)`;
            
            db.run(query, [moodData.apm, moodData.computed_mood, moodData.source, moodData.session_id || null], function(err) {
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
                SELECT id, apm, computed_mood, source, session_id, timestamp
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

    getMoodHistory(limit = 20, sessionGapMinutes = DEFAULT_SESSION_GAP_MINUTES) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, apm, computed_mood, source, session_id, timestamp
                FROM mood_logs
                ORDER BY timestamp ASC, id ASC
            `;

            db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const sessions = [];
                const gapMs = Math.max(1, sessionGapMinutes) * 60 * 1000;
                let currentSession = [];
                let lastTimestampMs = null;
                let lastSessionKey = null;

                rows.forEach((row) => {
                    const timestampMs = parseTimestampMs(row.timestamp);
                    if (timestampMs == null) {
                        return;
                    }

                    const sessionId = row.session_id || null;
                    const sessionKey = sessionId == null ? '__legacy__' : `sid:${sessionId}`;
                    const hasSessionBoundary = lastSessionKey != null && sessionKey !== lastSessionKey;

                    const isGapSessionBoundary = sessionId == null && lastTimestampMs != null && (timestampMs - lastTimestampMs > gapMs);
                    const isNewSession = hasSessionBoundary || isGapSessionBoundary;
                    if (isNewSession && currentSession.length > 0) {
                        sessions.push(currentSession);
                        currentSession = [];
                    }

                    currentSession.push(row);
                    lastTimestampMs = timestampMs;
                    lastSessionKey = sessionKey;
                });

                if (currentSession.length > 0) {
                    sessions.push(currentSession);
                }

                const limitedSessions = sessions.slice(-Math.max(1, limit));
                const history = [];
                let previousAverageApm = null;

                limitedSessions.forEach((sessionRows, index) => {
                    const summary = buildSessionSummary(sessionRows, index === 0 ? null : previousAverageApm);
                    history.push({
                        sessionIndex: sessions.length - limitedSessions.length + index + 1,
                        ...summary,
                    });
                    previousAverageApm = summary.averageApm;
                });

                resolve(history.reverse());
            });
        });
    }
}

module.exports = new MoodLogRepository();
