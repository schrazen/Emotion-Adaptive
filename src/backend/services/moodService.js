const moodLogRepo = require('../repositories/moodLogRepo');

class MoodService {
    async saveMoodSnapshot(data) {
        const payload = {
            apm: data.apm,
            computed_mood: data.computedMood,
            source: data.source || 'widget',
            session_id: process.env.EAUIS_SESSION_ID || null,
        };

        return moodLogRepo.insertMoodLog(payload);
    }

    async saveDetailedSignals(data) {
        try {
            return await moodLogRepo.insertMoodSignalLog(data);
        } catch (error) {
            console.error('Error saving detailed signals:', error);
            throw error;
        }
    }

    async addUserMoodFeedback(signalLogId, feedback) {
        try {
            return await moodLogRepo.addUserFeedback(signalLogId, feedback);
        } catch (error) {
            console.error('Error adding feedback:', error);
            throw error;
        }
    }

    async getAccuracyReport(days = 7) {
        try {
            return await moodLogRepo.getAccuracyAnalysis(days);
        } catch (error) {
            console.error('Error generating accuracy report:', error);
            throw error;
        }
    }

    async getLatestMood() {
        return moodLogRepo.getLatestMood();
    }

    async getMoodHistory(limit = 20) {
        return moodLogRepo.getMoodHistory(limit);
    }
}

module.exports = new MoodService();