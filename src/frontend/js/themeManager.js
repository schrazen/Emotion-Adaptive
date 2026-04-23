(function() {
    let isSubscribed = false;

    const applySavedTheme = () => {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');

        const savedEmotion = localStorage.getItem('autoTheme') === 'true'
            ? (document.body.getAttribute('data-emotion') || 'neutral')
            : 'neutral';
        document.body.setAttribute('data-emotion', savedEmotion.toLowerCase());
    };

    const initMoodTheming = () => {
        if (isSubscribed || !window.MoodTracker) {
            return;
        }
        
        window.MoodTracker.start();
        window.MoodTracker.subscribe((state) => {
            const isAutoTheme = localStorage.getItem('autoTheme') === 'true';
            const mood = isAutoTheme ? (state.mood || 'Neutral').toLowerCase() : 'neutral';
            document.body.setAttribute('data-emotion', mood);
        });

        if (typeof window.MoodTracker.getState === 'function') {
            const current = window.MoodTracker.getState();
            const isAutoTheme = localStorage.getItem('autoTheme') === 'true';
            const mood = isAutoTheme ? ((current && current.mood) || 'Neutral').toLowerCase() : 'neutral';
            document.body.setAttribute('data-emotion', mood);
        }

        isSubscribed = true;
    };

    document.addEventListener("DOMContentLoaded", () => {
        applySavedTheme();
        initMoodTheming();

        let retryCount = 0;
        const maxRetries = 20;
        const retryTimer = setInterval(() => {
            initMoodTheming();
            retryCount += 1;
            if (isSubscribed || retryCount >= maxRetries) {
                clearInterval(retryTimer);
            }
        }, 300);
    });

    window.addEventListener('page-loaded', () => {
        initMoodTheming();
    });
})();