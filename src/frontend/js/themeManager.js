(function() {
    let subscribedTracker = null;
    let appliedAutoMood = 'neutral';
    let pendingAutoMood = null;
    let pendingAutoMoodSince = 0;
    let pendingAutoMoodHits = 0;

    const AUTO_THEME_MIN_SWITCH_MS = 900;
    const AUTO_THEME_MIN_CONSISTENT_HITS = 2;

    const normalizeMood = (value) => {
        const mood = String(value || 'neutral').toLowerCase();
        if (mood === 'happy' || mood === 'angry' || mood === 'neutral') {
            return mood;
        }
        return 'neutral';
    };

    const applyMoodAttribute = (mood, options = {}) => {
        const force = Boolean(options.force);
        const isAutoTheme = localStorage.getItem('autoTheme') === 'true';
        if (!isAutoTheme) {
            appliedAutoMood = 'neutral';
            pendingAutoMood = null;
            pendingAutoMoodSince = 0;
            pendingAutoMoodHits = 0;
            document.body.setAttribute('data-emotion', 'manual');
            return;
        }

        const nextMood = normalizeMood(mood);
        if (force) {
            appliedAutoMood = nextMood;
            pendingAutoMood = null;
            pendingAutoMoodSince = 0;
            pendingAutoMoodHits = 0;
            document.body.setAttribute('data-emotion', nextMood);
            return;
        }

        if (nextMood === appliedAutoMood) {
            pendingAutoMood = null;
            pendingAutoMoodSince = 0;
            pendingAutoMoodHits = 0;
            return;
        }

        const now = Date.now();
        if (pendingAutoMood !== nextMood) {
            pendingAutoMood = nextMood;
            pendingAutoMoodSince = now;
            pendingAutoMoodHits = 1;
            return;
        }

        pendingAutoMoodHits += 1;
        const stableForMs = now - pendingAutoMoodSince;
        if (stableForMs < AUTO_THEME_MIN_SWITCH_MS || pendingAutoMoodHits < AUTO_THEME_MIN_CONSISTENT_HITS) {
            return;
        }

        appliedAutoMood = nextMood;
        pendingAutoMood = null;
        pendingAutoMoodSince = 0;
        pendingAutoMoodHits = 0;
        document.body.setAttribute('data-emotion', nextMood);
    };

    const applySavedTheme = () => {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');

        const savedEmotion = document.body.getAttribute('data-emotion') || 'neutral';
        appliedAutoMood = normalizeMood(savedEmotion);
        applyMoodAttribute(savedEmotion, { force: true });
    };

    const initMoodTheming = () => {
        const tracker = window.MoodTracker;
        if (!tracker || subscribedTracker === tracker) {
            return;
        }
        
        if (typeof tracker.start === 'function') {
            tracker.start();
        }

        if (typeof tracker.subscribe === 'function') {
            tracker.subscribe((state) => {
                applyMoodAttribute(state && state.mood);
            });
        }

        if (typeof tracker.getState === 'function') {
            const current = tracker.getState();
            applyMoodAttribute(current && current.mood, { force: true });
        }

        subscribedTracker = tracker;
    };

    document.addEventListener("DOMContentLoaded", () => {
        applySavedTheme();
        initMoodTheming();

        let retryCount = 0;
        const maxRetries = 20;
        const retryTimer = setInterval(() => {
            initMoodTheming();
            retryCount += 1;
            if (subscribedTracker || retryCount >= maxRetries) {
                clearInterval(retryTimer);
            }
        }, 300);
    });

    window.addEventListener('page-loaded', () => {
        initMoodTheming();
    });
})();