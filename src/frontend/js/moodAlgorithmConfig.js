// Central mood algorithm config.
// Tweak these values to change mood behavior without editing moodTracker.js.
window.MoodAlgorithmConfig = {
    // How quickly mood can switch after a previous mood change.
    moodCooldownMs: 3000,

    // Emotional memory: higher decay keeps moods around longer; lower decay forgets faster.
    angerDecay: 0.88,
    angerDecayNoEvidence: 0.76,
    joyDecay: 0.84,

    // Minimum accumulated level required before a mood can win.
    angerLevelThreshold: 3.5,
    joyLevelThreshold: 3.0,

    // If two moods compete, this is the extra lead required to beat the other.
    moodLeadGap: 0.75,

    // Angry must have enough current evidence; level memory alone should not flip mood.
    angryTransitionMinEvidenceScore: 2,
    angryEvidenceErrorPressureMin: 1.2,
    angryEvidenceInstabilityExcessMin: 2.5,

    // Immediate boosts applied when a strong signal appears in the current tick.
    joyBoost: 3.0,
    frustrationTextBoost: 1.4,
    instabilityBoost: 0.8,
    errorRateBoost: 0.08,
    backspaceBurstBoost: 0.35,

    // Instability is derived from the gap between short burst and baseline typing speed.
    instabilityThreshold: 220,
    instabilityScale: 90,

    // Backspace burst looks at recent corrections, not just overall error rate.
    backspaceBurstWindowMs: 2000,
    backspaceBurstThreshold: 4,

    // Strict 3-state model: Angry, Happy, Neutral.

    // Timing for joy detection and how long Happy can linger after joy ends.
    joyWindowMs: 2800,
    joyRetriggerGapMs: 1400,
    happyLingerMs: 450,

    // Text buffer controls for sentiment pattern detection.
    textTailWindow: 36,
    textSignalActivityMaxAgeMs: 1800,

    // Metrics windows and smoothing.
    metricsWindowMs: 60000,
    burstWindowMs: 2000,
    baselineWindowMs: 12000,
    apmSmoothingKeep: 0.8,
    apmSmoothingNew: 0.2,
    apmSoftCap: 360,

    // Error rate only becomes meaningful after this many keys.
    minRawApmForErrorRate: 10,

    // Joy regexes. Add/remove patterns to tune joy sensitivity.
    joyPatterns: [
        /(^|\W)lol(\W|$)/i,
        /(^|\W)lmao(\W|$)/i,
        /(^|\W)rofl(\W|$)/i,
        /h[ae]{1,}h[ae]{1,}/i,
        /ha(ha){2,}/i,
        /(^|\W)hehe+/i,
        /(^|\W)wkwk+/i,
        /😂|🤣|😆|😄|😀|😁|😹/
    ],

    // Weighted frustration patterns. Higher weight means stronger angry evidence.
    frustrationPatterns: [
        { name: 'punctuation-abuse', regex: /[!?]{3,}/, weight: 1 },
        { name: 'elongation', regex: /(.)\1{4,}/i, weight: 2 },
        { name: 'digital-shout', regex: /[A-Z]{6,}/, weight: 2 },
        { name: 'negative-phrase', regex: /(not working|doesn't work|does not work|broken|failed|keeps happening|keeps failing|won't work|wont work)/i, weight: 2 },
        { name: 'repetition-loop', regex: /(\b\w+\b)(\s+\1){2,}/i, weight: 2 },
        // Match explicit rage words even in continuous typing without spaces.
        { name: 'rage-lexicon', regex: /(fuck|shit|damn|argh|ugh|hate|stupid|curse)/i, weight: 3 }
    ],

    // Keyboard mash sequences by physical keyboard rows.
    // Only these patterns count as row-mash frustration.
    mashRows: [
        {
            name: 'mash-home-row',
            weight: 2,
            sequences: ['asdfg', 'sdfgh', 'dfghj', 'fghjk', 'ghjkl', 'lkjhg', 'kjhgf', 'jhgfd', 'hgfds', 'gfdsa']
        },
        {
            name: 'mash-top-row',
            weight: 2,
            sequences: ['qwert', 'werty', 'ertyu', 'rtyui', 'tyuio', 'yuiop', 'poiuy', 'oiuyt', 'iuytr', 'uytre', 'ytrew', 'trewq']
        },
        {
            name: 'mash-bottom-row',
            weight: 2,
            sequences: ['zxcvb', 'xcvbn', 'cvbnm', 'mnbvc', 'nbvcx', 'bvcxz']
        }
    ],

    // Minimum text score needed to count as frustration.
    // Set to 2 so single strong indicators (e.g. row mash, elongation) can trigger Angry.
    frustrationTextMinScore: 2,

    // Lower text score can still count if errors are already elevated.
    // Keep this at 2 so punctuation-only noise (score 1) does not trigger Angry by itself.
    frustrationTextMinScoreWithErrors: 2,
    frustrationTextErrorRateGate: 12,

    // Rules used to compute speedScore (combined speed frustration evidence).
    speedScoreRules: [
        { apmGte: 230 },
        { apmGte: 180, errorRateGte: 16 },
        { burstApmGte: 420, burstDeltaGte: 220 },
        { burstApmGte: 520 },
        { errorRateGte: 24 }
    ],

    // Minimum speed score required to allow speed-based angry.
    minSpeedScoreForAngry: 2,

    // Sustained and burst frustration gates.
    sustainedAngryApmGte: 230,
    sustainedAngryErrorRateGte: 12,
    burstAngryApmGte: 110,
    burstAngryBurstApmGte: 420,
    burstAngryBurstDeltaGte: 220,
    burstAngryErrorRateGte: 10,

    // Frustration-detected debug log throttle.
    frustrationLogThrottleMs: 1200,

    // Debug log emission throttle for regular heartbeats.
    debugLogThrottleMs: 800,

    // Keep a rolling history of the latest mood decisions for debugging and learning.
    moodHistorySize: 50,
};
