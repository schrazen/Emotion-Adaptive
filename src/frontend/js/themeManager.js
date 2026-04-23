(function() {
    const applySavedTheme = () => {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        const savedAccent = localStorage.getItem('userAccent');
        
        document.body.classList.toggle('dark-mode', isDarkMode);
        
        if (savedAccent) {
            document.body.classList.remove('accent-blue', 'accent-red', 'accent-plain');
            document.body.classList.add(`accent-${savedAccent}`);
        }
    };

    const initMoodTheming = () => {
        if (!window.MoodTracker) return;
        
        window.MoodTracker.start();
        window.MoodTracker.subscribe((state) => {
            const isAutoTheme = localStorage.getItem('autoTheme') === 'true';
            const mood = isAutoTheme ? (state.mood || 'Neutral').toLowerCase() : 'neutral';
            document.body.setAttribute('data-mood', mood);
        });
    };

    document.addEventListener("DOMContentLoaded", () => {
        applySavedTheme();
        initMoodTheming();
    });
})();