const moodService = require('../services/moodService');

class MoodController {
    async handleMoodSnapshot(_event, moodData) {
        try {
            if (!moodData || typeof moodData.apm !== 'number' || moodData.apm < 0) {
                return { success: false, message: 'Invalid APM value.' };
            }

            const validMoods = ['Happy', 'Neutral', 'Stressed'];
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

    async handleGetMood() {
        try {
            const latest = await moodService.getLatestMood();
            return latest || { computed_mood: 'Neutral', apm: 0, source: 'system-default' };
        } catch (error) {
            console.error('Get mood controller error', error);
            return { computed_mood: 'Neutral', apm: 0, source: 'system-fallback' };
        }
    }
}

module.exports = new MoodController();