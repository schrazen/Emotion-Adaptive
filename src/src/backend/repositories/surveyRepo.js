const db = require('../database/sqlite-setup');

class SurveyRepository {
    insertSurvey(surveyData) {
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO surveys (rating, mood_state) VALUES (?, ?)`;
            
            db.run(query, [surveyData.rating, surveyData.mood_state], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, ...surveyData });
                }
            });
        });
    }
}

module.exports = new SurveyRepository();
