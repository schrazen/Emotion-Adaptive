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

    insertMoodSignalLog(signalData) {
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO mood_signal_logs (
                mood_log_id,
                error_rate,
                burst_apm,
                baseline_apm,
                instability,
                backspace_burst_count,
                frustration_text_score,
                frustration_text_matches,
                joy_active,
                is_frustrated_by_text,
                is_frustrated_by_speed,
                anger_level,
                joy_level,
                context_app,
                session_duration_minutes,
                hour_of_day,
                is_circadian_adjusted,
                signals_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            db.run(query, [
                signalData.moodLogId || null,
                signalData.errorRate || 0,
                signalData.burstApm || 0,
                signalData.baselineApm || 0,
                signalData.instability || 0,
                signalData.backspaceBurstCount || 0,
                signalData.frustrationTextScore || 0,
                signalData.frustrationTextMatches ? JSON.stringify(signalData.frustrationTextMatches) : null,
                signalData.joyActive ? 1 : 0,
                signalData.isFrustratedByText ? 1 : 0,
                signalData.isFrustratedBySpeed ? 1 : 0,
                signalData.angerLevel || 0,
                signalData.joyLevel || 0,
                signalData.contextApp || null,
                signalData.sessionDurationMinutes || 0,
                signalData.hourOfDay || null,
                signalData.isCircadianAdjusted ? 1 : 0,
                signalData.signalsJson ? JSON.stringify(signalData.signalsJson) : null
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...signalData });
                }
            });
        });
    }

    addUserFeedback(moodSignalLogId, feedback) {
        return new Promise((resolve, reject) => {
            const query = `UPDATE mood_signal_logs 
                SET user_feedback = ?, feedback_timestamp = CURRENT_TIMESTAMP 
                WHERE id = ?`;
            
            db.run(query, [feedback, moodSignalLogId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ updated: this.changes > 0 });
                }
            });
        });
    }

    getAccuracyAnalysis(days = 7) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    computed_mood,
                    user_feedback,
                    COUNT(*) as count,
                    AVG(CAST(error_rate AS FLOAT)) as avg_error_rate,
                    AVG(CAST(apm AS INTEGER)) as avg_apm,
                    AVG(CAST(anger_level AS FLOAT)) as avg_anger_level,
                    AVG(CAST(frustration_text_score AS FLOAT)) as avg_frustration_score
                FROM mood_signal_logs msl
                JOIN mood_logs ml ON msl.mood_log_id = ml.id
                WHERE datetime(msl.timestamp) >= datetime('now', '-' || ? || ' days')
                GROUP BY computed_mood, user_feedback
                ORDER BY computed_mood, user_feedback
            `;
            
            db.all(query, [days], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }
}

module.exports = new MoodLogRepository();
