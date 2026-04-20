const moodLogRepo = require('../repositories/moodLogRepo');

class MoodService {
    async saveMoodSnapshot(data) {
        const payload = {
            apm: data.apm,
            computed_mood: data.computedMood,
            source: data.source || 'widget'
        };

        return moodLogRepo.insertMoodLog(payload);
    }

    async getLatestMood() {
        return moodLogRepo.getLatestMood();
    }

    async getMoodHistory(limit = 20) {
        return moodLogRepo.getMoodHistory(limit);
    }
}

module.exports = new MoodService();