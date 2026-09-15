const moodService = require('../services/moodService');

class MoodController {
    async handleMoodSnapshot(_event, moodData) {
        try {
            if (!moodData || typeof moodData.apm !== 'number' || moodData.apm < 0) {
                return { success: false, message: 'Invalid APM value.' };
            }

            const validMoods = ['Happy', 'Neutral', 'Angry'];
            if (!validMoods.includes(moodData.computedMood)) {
                return { success: false, message: 'Invalid mood state.' };
            }

            const result = await moodService.saveMoodSnapshot(moodData);
            return { success: true, result };
        } catch (error) {
            console.error('Mood snapshot controller error', error);
            return { success: false, error: error.message };
        }
    }

    async handleSaveDetailedSignals(_event, signalData) {
        try {
            if (!signalData) {
                return { success: false, message: 'No signal data provided.' };
            }

            const result = await moodService.saveDetailedSignals(signalData);
            return { success: true, result };
        } catch (error) {
            console.error('Save detailed signals controller error', error);
            return { success: false, error: error.message };
        }
    }

    async handleAddMoodFeedback(_event, feedbackData) {
        try {
            if (!feedbackData || !feedbackData.signalLogId || !feedbackData.feedback) {
                return { success: false, message: 'Invalid feedback data.' };
            }

            const result = await moodService.addUserMoodFeedback(feedbackData.signalLogId, feedbackData.feedback);
            return { success: true, result };
        } catch (error) {
            console.error('Add feedback controller error', error);
            return { success: false, error: error.message };
        }
    }

    async handleGetAccuracyReport(_event, days = 7) {
        try {
            const report = await moodService.getAccuracyReport(days);
            return { success: true, report };
        } catch (error) {
            console.error('Get accuracy report error', error);
            return { success: false, error: error.message };
        }
    }

    async handleGetMood() {
        try {
            const latest = await moodService.getLatestMood();
            return latest || { computed_mood: 'Neutral', apm: 0, source: 'system-default' };
        } catch (error) {
            console.error('Get mood controller error', error);
            return { computed_mood: 'Neutral', apm: 0, source: 'system-fallback' };
        }
    }

    async handleGetMoodHistory(_event, limit) {
        try {
            const numericLimit = Number(limit);
            const safeLimit = Number.isFinite(numericLimit) && numericLimit > 0 ? Math.min(Math.floor(numericLimit), 50) : 20;
            const history = await moodService.getMoodHistory(safeLimit);
            return { success: true, history };
        } catch (error) {
            console.error('Get mood history controller error', error);
            return { success: false, history: [], error: error.message };
        }
    }
}

module.exports = new MoodController();