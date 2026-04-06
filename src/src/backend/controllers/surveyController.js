const surveyService = require('../services/surveyService');

class SurveyController {
    async handleSurveySubmission(event, surveyData) {
        try {
            // Validate the survey content
            if (!surveyData || surveyData.rating < 1 || surveyData.rating > 5) {
                return { success: false, message: 'Invalid rating.' };
            }
            // Pass to service
            const result = await surveyService.saveSurvey(surveyData);
            return { success: true, result };
        } catch (error) {
            console.error('Survey controller error', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new SurveyController();
