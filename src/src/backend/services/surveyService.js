const surveyRepo = require('../repositories/surveyRepo');

class SurveyService {
    async saveSurvey(data) {
        // Business logic goes here (e.g. adding metadata before saving)
        const payload = {
            rating: data.rating,
            mood_state: data.currentMood || 'Unknown'
        };

        // Pass to repository for database storage
        return await surveyRepo.insertSurvey(payload);
    }
}

module.exports = new SurveyService();
