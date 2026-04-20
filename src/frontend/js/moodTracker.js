window.MoodTracker = (function () {
    const config = window.MoodAlgorithmConfig || {};

    const keyTimestamps = [];
    const backspaceTimestamps = [];
    const joyTimestamps = [];
    const listeners = [];

    const JOY_PATTERNS = config.joyPatterns || [
        /(^|\W)lol(\W|$)/i, /(^|\W)lmao(\W|$)/i, /(^|\W)rofl(\W|$)/i,
        /h[ae]{1,}h[ae]{1,}/i, /ha(ha){2,}/i, /(^|\W)hehe+/i, /(^|\W)wkwk+/i,
        /😂|🤣|😆|😄|😀|😁|😹/
    ];

    const FRUSTRATION_PATTERNS = config.frustrationPatterns || [
        { name: 'punctuation-abuse', regex: /[!?]{3,}/, weight: 1 },
        { name: 'elongation', regex: /(.)\1{4,}/i, weight: 2 },
        { name: 'digital-shout', regex: /[A-Z]{6,}/, weight: 2 },
        { name: 'rage-lexicon', regex: /(^|\W)(fuck|shit|damn|argh|ugh|hate|stupid|curse)(\W|$)/i, weight: 3 }
    ];

    const MASH_ROW_DEFS = config.mashRows || [
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
    ];

    const SPEED_SCORE_RULES = config.speedScoreRules || [
        { apmGte: 230 },
        { apmGte: 180, errorRateGte: 16 },
        { burstApmGte: 420, burstDeltaGte: 220 },
        { burstApmGte: 520 },
        { errorRateGte: 24 },
    ];

    const NON_ACTIVITY_KEYS = new Set([
        'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
    ]);

    let recentText = '';
    let smoothedApm = 0;
    let lastTrackedAt = 0;
    let lastTrackedKeycode = null;
    let lastTrackedKeyAt = 0;

    // Hysteresis and state tracking to reduce mood flicker.
    let currentState = { mood: 'Neutral', apm: 0 };
    let lastMoodChangeAt = 0;
    const MOOD_COOLDOWN_MS = config.moodCooldownMs ?? 3000;
    let angerLevel = 0;
    let joyLevel = 0;
    const recentMoodDecisions = [];

    let globalInputHooked = false;
    let started = false;
    let lastDebugLogAt = 0;
    let logPathPrinted = false;
    let lastFrustrationSignalAt = 0;

    const JOY_WINDOW_MS = config.joyWindowMs ?? 2800;
    const JOY_RETRIGGER_GAP_MS = config.joyRetriggerGapMs ?? 1400;
    const HAPPY_LINGER_MS = config.happyLingerMs ?? 450;
    const TEXT_TAIL_WINDOW = config.textTailWindow ?? 36;
    const TEXT_SIGNAL_ACTIVITY_MAX_AGE_MS = config.textSignalActivityMaxAgeMs ?? 1800;
    const METRICS_WINDOW_MS = config.metricsWindowMs ?? 60000;
    const BURST_WINDOW_MS = config.burstWindowMs ?? 2000;
    const BASELINE_WINDOW_MS = config.baselineWindowMs ?? 12000;
    const APM_SMOOTHING_KEEP = config.apmSmoothingKeep ?? 0.8;
    const APM_SMOOTHING_NEW = config.apmSmoothingNew ?? 0.2;
    const APM_SOFT_CAP = config.apmSoftCap ?? 360;
    const MIN_RAW_APM_FOR_ERROR_RATE = config.minRawApmForErrorRate ?? 10;

    const FRUSTRATION_TEXT_MIN_SCORE = config.frustrationTextMinScore ?? 3;
    const FRUSTRATION_TEXT_MIN_SCORE_WITH_ERRORS = config.frustrationTextMinScoreWithErrors ?? 2;
    const FRUSTRATION_TEXT_ERROR_RATE_GATE = config.frustrationTextErrorRateGate ?? 12;

    const MIN_SPEED_SCORE_FOR_ANGRY = config.minSpeedScoreForAngry ?? 2;
    const SUSTAINED_ANGRY_APM_GTE = config.sustainedAngryApmGte ?? 230;
    const SUSTAINED_ANGRY_ERROR_RATE_GTE = config.sustainedAngryErrorRateGte ?? 12;
    const BURST_ANGRY_APM_GTE = config.burstAngryApmGte ?? 110;
    const BURST_ANGRY_BURST_APM_GTE = config.burstAngryBurstApmGte ?? 420;
    const BURST_ANGRY_BURST_DELTA_GTE = config.burstAngryBurstDeltaGte ?? 220;
    const BURST_ANGRY_ERROR_RATE_GTE = config.burstAngryErrorRateGte ?? 10;

    const DEBUG_MOOD_LOGS = true;

    function debugLog(payload, force = false) {
        if (!DEBUG_MOOD_LOGS) {
            return;
        }

        const now = Date.now();
        if (!force && now - lastDebugLogAt < (config.debugLogThrottleMs ?? 800)) {
            return;
        }

        lastDebugLogAt = now;
        console.log('[MoodTracker]', payload);

        if (window.api && typeof window.api.logMoodDebug === 'function') {
            window.api.logMoodDebug(payload);
        }
    }

    function trimWindow(queue, msWindow) {
        const cutoff = Date.now() - msWindow;
        while (queue.length > 0 && queue[0] < cutoff) {
            queue.shift();
        }
    }

    function computeMetrics() {
        trimWindow(keyTimestamps, METRICS_WINDOW_MS);
        trimWindow(backspaceTimestamps, METRICS_WINDOW_MS);

        const rawApm = keyTimestamps.length;

        smoothedApm = smoothedApm === 0
            ? rawApm
            : (smoothedApm * APM_SMOOTHING_KEEP) + (rawApm * APM_SMOOTHING_NEW);

        // Burst estimate from the most recent 2 seconds.
        const now = Date.now();
        const burstCount = keyTimestamps.filter((ts) => ts >= now - BURST_WINDOW_MS).length;
        const burstApm = Math.round((burstCount / BURST_WINDOW_MS) * 60000);

        // Baseline from 12s..2s ago to detect sudden acceleration.
        const baselineCount = keyTimestamps.filter((ts) => ts >= now - BASELINE_WINDOW_MS && ts < now - BURST_WINDOW_MS).length;
        const baselineSpanMs = Math.max(BASELINE_WINDOW_MS - BURST_WINDOW_MS, 1);
        const baselineApm = Math.round((baselineCount / baselineSpanMs) * 60000);
        // Instability only counts sudden acceleration, not slowdown after activity ends.
        const instability = Math.max(0, burstApm - baselineApm);
        const backspaceBurstCount = backspaceTimestamps.filter((ts) => ts >= now - (config.backspaceBurstWindowMs ?? 2000)).length;

        // Soft cap to keep displayed APM in realistic human range.
        const normalizedApm = Math.min(Math.round(smoothedApm), APM_SOFT_CAP);

        let errorRate = 0;
        if (rawApm > MIN_RAW_APM_FOR_ERROR_RATE) {
            errorRate = (backspaceTimestamps.length / rawApm) * 100;
        }

        return {
            apm: normalizedApm,
            errorRate,
            burstApm,
            baselineApm,
            instability,
            backspaceBurstCount,
        };
    }

    function hasRecentJoySignal() {
        trimWindow(joyTimestamps, JOY_WINDOW_MS);
        return joyTimestamps.length > 0;
    }

    function detectFrustrationFromBuffer() {
        const now = Date.now();
        const textAgeMs = now - lastTrackedAt;
        if (textAgeMs > TEXT_SIGNAL_ACTIVITY_MAX_AGE_MS) {
            return {
                active: false,
                score: 0,
                matches: [],
                tail: '',
                textAgeMs,
            };
        }

        const tail = recentText.slice(-TEXT_TAIL_WINDOW);
        const compactTail = tail.replace(/\s+/g, '');
        let score = 0;
        const matches = [];

        // Detect keyboard mashing by row-walk sequences (e.g. qwert, asdfg, zxcvb).
        // This avoids flagging ordinary prose as mash.
        const lowerTail = compactTail.toLowerCase();
        MASH_ROW_DEFS.forEach(({ name, sequences, weight }) => {
            const hasRowWalk = sequences.some((seq) => lowerTail.includes(seq));
            if (hasRowWalk) {
                score += Number(weight ?? 2);
                matches.push(name);
            }
        });

        FRUSTRATION_PATTERNS.forEach(({ name, regex, weight }) => {
            const input = name === 'rage-lexicon' ? tail : compactTail;
            if (regex.test(input)) {
                score += weight;
                matches.push(name);
            }
        });

        return {
            active: score >= 2,
            score,
            matches,
            tail,
            textAgeMs,
        };
    }

    function clampLevel(level) {
        return Math.max(0, Math.min(level, 10));
    }

    function updateEmotionalLevels({ joyActive, frustrationText, instability, errorRate, backspaceBurstCount, apm }) {
        const angerDecay = config.angerDecay ?? 0.88;
        const joyDecay = config.joyDecay ?? 0.84;

        const frustrationTextBoost = config.frustrationTextBoost ?? 1.4;
        const instabilityBoost = config.instabilityBoost ?? 1.1;
        const errorRateBoost = config.errorRateBoost ?? 0.08;
        const backspaceBurstBoost = config.backspaceBurstBoost ?? 0.9;
        const joyBoost = config.joyBoost ?? 3.0;

        const instabilityThreshold = config.instabilityThreshold ?? 160;
        const instabilityScale = config.instabilityScale ?? 90;
        const backspaceBurstThreshold = config.backspaceBurstThreshold ?? 4;

        const instabilityExcess = Math.max(0, instability - instabilityThreshold) / Math.max(instabilityScale, 1);
        const errorPressure = Math.max(0, errorRate - 5) / 10;
        const backspacePressure = Math.max(0, backspaceBurstCount - backspaceBurstThreshold + 1);

        const angerImmediate =
            (frustrationText.score * frustrationTextBoost) +
            (instabilityExcess * instabilityBoost) +
            (errorPressure * errorRateBoost) +
            (backspacePressure * backspaceBurstBoost);

        const joyImmediate = joyActive ? joyBoost : 0;

        angerLevel = clampLevel((angerLevel * angerDecay) + angerImmediate);
        joyLevel = clampLevel((joyLevel * joyDecay) + joyImmediate);

        return {
            angerLevel,
            joyLevel,
            angerImmediate,
            joyImmediate,
            instabilityExcess,
            errorPressure,
            backspacePressure,
        };
    }

    function selectMoodFromLevels(levels, context) {
        const angryLevelThreshold = config.angerLevelThreshold ?? 3.5;
        const joyLevelThreshold = config.joyLevelThreshold ?? 3.0;
        const moodLeadGap = config.moodLeadGap ?? 0.75;

        const angryLead = levels.angerLevel >= levels.joyLevel + moodLeadGap;
        const happyLead = levels.joyLevel >= levels.angerLevel + moodLeadGap;

        if (levels.angerLevel >= angryLevelThreshold && angryLead) {
            return 'Angry';
        }

        if (levels.joyLevel >= joyLevelThreshold && happyLead) {
            return 'Happy';
        }

        return 'Neutral';
    }

    function appendTextToken(token) {
        if (!token) {
            return;
        }

        if (token === 'BACKSPACE') {
            recentText = recentText.slice(0, -1);
            backspaceTimestamps.push(Date.now());
        } else if (token === 'SPACE' || token === 'ENTER') {
            recentText += ' ';
        } else {
            recentText += token;
        }

        if (recentText.length > 200) {
            recentText = recentText.slice(-200);
        }

        const textTail = recentText.slice(-TEXT_TAIL_WINDOW);
        if (JOY_PATTERNS.some((pattern) => pattern.test(textTail))) {
            const now = Date.now();
            if (joyTimestamps.length === 0 || (now - joyTimestamps[joyTimestamps.length - 1] > JOY_RETRIGGER_GAP_MS)) {
                joyTimestamps.push(now);
                debugLog({
                    event: 'joy-detected',
                    tail: textTail,
                    joyCount: joyTimestamps.length,
                    at: now,
                }, true);
            }
        }
    }

    function moodFromSignals(apm, errorRate, burstApm, baselineApm, metrics = {}) {
        const now = Date.now();
        const timeSinceLastChange = now - lastMoodChangeAt;
        const joyActive = hasRecentJoySignal();
        const burstDelta = burstApm - baselineApm;
        const frustrationText = detectFrustrationFromBuffer();

        const isFrustratedByText =
            frustrationText.score >= FRUSTRATION_TEXT_MIN_SCORE ||
            (frustrationText.score >= FRUSTRATION_TEXT_MIN_SCORE_WITH_ERRORS && errorRate >= FRUSTRATION_TEXT_ERROR_RATE_GATE);

        if (isFrustratedByText && (now - lastFrustrationSignalAt > (config.frustrationLogThrottleMs ?? 1200))) {
            lastFrustrationSignalAt = now;
            debugLog({
                event: 'frustration-detected',
                score: frustrationText.score,
                matches: frustrationText.matches,
                textAgeMs: frustrationText.textAgeMs,
                tail: frustrationText.tail,
                at: now,
            }, true);
        }

        const speedScore = SPEED_SCORE_RULES.filter((rule) => {
            if (rule.apmGte != null && apm < rule.apmGte) return false;
            if (rule.errorRateGte != null && errorRate < rule.errorRateGte) return false;
            if (rule.burstApmGte != null && burstApm < rule.burstApmGte) return false;
            if (rule.burstDeltaGte != null && burstDelta < rule.burstDeltaGte) return false;
            return true;
        }).length;

        const backspaceBurstCount = metrics.backspaceBurstCount || 0;
        const levels = updateEmotionalLevels({
            joyActive,
            frustrationText,
            instability: metrics.instability ?? Math.max(0, burstApm - baselineApm),
            errorRate,
            backspaceBurstCount,
            apm,
        });

        const isSustainedAngry = apm >= SUSTAINED_ANGRY_APM_GTE && errorRate >= SUSTAINED_ANGRY_ERROR_RATE_GTE;
        const isSuddenBurstAngry =
            apm >= BURST_ANGRY_APM_GTE &&
            burstApm >= BURST_ANGRY_BURST_APM_GTE &&
            burstDelta >= BURST_ANGRY_BURST_DELTA_GTE &&
            errorRate >= BURST_ANGRY_ERROR_RATE_GTE;
        const isFrustratedBySpeed = (isSustainedAngry || isSuddenBurstAngry) && speedScore >= MIN_SPEED_SCORE_FOR_ANGRY;
        const isFrustrated = isFrustratedByText || (!joyActive && isFrustratedBySpeed);
        const moodScore = Number((levels.joyLevel - levels.angerLevel).toFixed(2));

        let targetMood = selectMoodFromLevels(levels);

        if (targetMood === 'Neutral' && currentState.mood === 'Happy' && timeSinceLastChange < HAPPY_LINGER_MS) {
            // Keep happy only briefly to avoid stale joy lock.
            targetMood = 'Happy';
        }

        recentMoodDecisions.push({
            at: now,
            mood: targetMood,
            moodScore,
            angerLevel: Number(levels.angerLevel.toFixed(2)),
            joyLevel: Number(levels.joyLevel.toFixed(2)),
        });
        if (recentMoodDecisions.length > (config.moodHistorySize ?? 50)) {
            recentMoodDecisions.shift();
        }

        if (targetMood !== currentState.mood) {
            if (timeSinceLastChange > MOOD_COOLDOWN_MS || targetMood === 'Angry') {
                lastMoodChangeAt = now;
                return {
                    mood: targetMood,
                    changed: true,
                    blockedByCooldown: false,
                    signals: {
                        joyActive,
                        burstDelta,
                        instability: metrics.instability ?? Math.max(0, burstApm - baselineApm),
                        backspaceBurstCount,
                        backspacePressure: Number(levels.backspacePressure.toFixed(2)),
                        moodScore,
                        isSustainedAngry,
                        isSuddenBurstAngry,
                        isFrustratedBySpeed,
                        isFrustratedByText,
                        speedScore,
                        isFrustrated,
                        frustrationTextScore: frustrationText.score,
                        frustrationTextMatches: frustrationText.matches,
                        frustrationTextAgeMs: frustrationText.textAgeMs,
                        angerLevel: Number(levels.angerLevel.toFixed(2)),
                        joyLevel: Number(levels.joyLevel.toFixed(2)),
                    },
                };
            }

            return {
                mood: currentState.mood,
                changed: false,
                blockedByCooldown: true,
                signals: {
                    joyActive,
                    burstDelta,
                    instability: metrics.instability ?? Math.max(0, burstApm - baselineApm),
                    backspaceBurstCount,
                    backspacePressure: Number(levels.backspacePressure.toFixed(2)),
                    moodScore,
                    isSustainedAngry,
                    isSuddenBurstAngry,
                    isFrustratedBySpeed,
                    isFrustratedByText,
                    speedScore,
                    isFrustrated,
                    frustrationTextScore: frustrationText.score,
                    frustrationTextMatches: frustrationText.matches,
                    frustrationTextAgeMs: frustrationText.textAgeMs,
                    angerLevel: Number(levels.angerLevel.toFixed(2)),
                    joyLevel: Number(levels.joyLevel.toFixed(2)),
                },
            };
        }

        return {
            mood: currentState.mood,
            changed: false,
            blockedByCooldown: false,
            signals: {
                joyActive,
                burstDelta,
                instability: metrics.instability ?? Math.max(0, burstApm - baselineApm),
                backspaceBurstCount,
                backspacePressure: Number(levels.backspacePressure.toFixed(2)),
                moodScore,
                isSustainedAngry,
                isSuddenBurstAngry,
                isFrustratedBySpeed,
                isFrustratedByText,
                speedScore,
                isFrustrated,
                frustrationTextScore: frustrationText.score,
                frustrationTextMatches: frustrationText.matches,
                frustrationTextAgeMs: frustrationText.textAgeMs,
                angerLevel: Number(levels.angerLevel.toFixed(2)),
                joyLevel: Number(levels.joyLevel.toFixed(2)),
            },
        };
    }

    function emit(state) {
        if (state.mood !== currentState.mood || state.apm !== currentState.apm) {
            currentState = state;
            listeners.forEach((callback) => callback(state));
        }
    }

    function mapKeycodeToToken(keycode) {
        if (typeof keycode !== 'number') {
            return null;
        }

        const letterMap = {
            30: 'a', 48: 'b', 46: 'c', 32: 'd', 18: 'e', 33: 'f', 34: 'g', 35: 'h',
            23: 'i', 36: 'j', 37: 'k', 38: 'l', 50: 'm', 49: 'n', 24: 'o', 25: 'p',
            16: 'q', 19: 'r', 31: 's', 20: 't', 22: 'u', 47: 'v', 17: 'w', 45: 'x',
            21: 'y', 44: 'z'
        };

        if (letterMap[keycode]) return letterMap[keycode];

        if (keycode === 57) return 'SPACE';
        if (keycode === 28) return 'ENTER';
        if (keycode === 14) return 'BACKSPACE';

        return null;
    }

    function trackActivity(keycode, token, eventTime) {
        const now = typeof eventTime === 'number' ? eventTime : Date.now();

        // Filter noisy repeat events that inflate APM unrealistically.
        if (now - lastTrackedAt < 24) {
            return;
        }

        if (typeof keycode === 'number' && keycode === lastTrackedKeycode && now - lastTrackedKeyAt < 68) {
            return;
        }

        keyTimestamps.push(now);
        lastTrackedAt = now;
        lastTrackedKeyAt = now;
        lastTrackedKeycode = typeof keycode === 'number' ? keycode : null;

        const effectiveToken = token || mapKeycodeToToken(keycode);
        appendTextToken(effectiveToken);
    }

    function handleLocalKeydown(event) {
        if (globalInputHooked || NON_ACTIVITY_KEYS.has(event.key)) {
            return;
        }

        let token = null;
        if (event.key === 'Backspace') token = 'BACKSPACE';
        else if (event.key === 'Enter') token = 'ENTER';
        else if (event.key === ' ') token = 'SPACE';
        else if (event.key.length === 1) token = event.key;

        trackActivity(null, token, Date.now());
    }

    function start() {
        if (started) {
            return;
        }
        started = true;

        document.addEventListener('keydown', handleLocalKeydown);

        if (window.api && typeof window.api.onGlobalKeyActivity === 'function') {
            window.api.onGlobalKeyActivity((data) => {
                globalInputHooked = true;
                trackActivity(data?.keycode, data?.token, data?.when);
            });
        }

        if (!logPathPrinted && window.api && typeof window.api.getMoodDebugLogPath === 'function') {
            window.api.getMoodDebugLogPath().then((logPath) => {
                logPathPrinted = true;
                debugLog({ event: 'log-path', path: logPath }, true);
            }).catch(() => {
                // Ignore path fetch errors in renderer.
            });
        }

        setInterval(() => {
            const metrics = computeMetrics();
            const decision = moodFromSignals(metrics.apm, metrics.errorRate, metrics.burstApm, metrics.baselineApm, metrics);
            const mood = decision.mood;
            const apm = metrics.apm;

            debugLog({
                event: 'heartbeat',
                apm,
                errorRate: Number(metrics.errorRate.toFixed(2)),
                burstApm: metrics.burstApm,
                baselineApm: metrics.baselineApm,
                previousMood: currentState.mood,
                nextMood: mood,
                changed: decision.changed,
                blockedByCooldown: decision.blockedByCooldown,
                signals: decision.signals,
            });

            emit({ mood, apm });
        }, 500);

        setInterval(async () => {
            if (!window.api || !window.api.saveMoodSnapshot) {
                return;
            }

            const metrics = computeMetrics();
            const decision = moodFromSignals(metrics.apm, metrics.errorRate, metrics.burstApm, metrics.baselineApm, metrics);
            const mood = decision.mood;
            const apm = metrics.apm;
            try {
                await window.api.saveMoodSnapshot({
                    apm,
                    computedMood: mood,
                    source: 'widget-keydown'
                });

                debugLog({
                    event: 'snapshot-saved',
                    apm,
                    mood,
                    errorRate: Number(metrics.errorRate.toFixed(2)),
                    burstApm: metrics.burstApm,
                    baselineApm: metrics.baselineApm,
                }, true);
            } catch (_error) {
                // Ignore save errors to keep tracking alive.
            }
        }, 5000);

        if (window.api && window.api.getMood) {
            window.api.getMood().then((latest) => {
                if (latest && typeof latest.apm === 'number' && latest.computed_mood) {
                    // Keep the last mood label, but start live APM from current session activity.
                    emit({ mood: latest.computed_mood, apm: 0 });
                }
            }).catch(() => {
                // Ignore initial fetch errors and continue with defaults.
            });
        }
    }

    function subscribe(callback) {
        listeners.push(callback);
        callback(currentState);

        return () => {
            const idx = listeners.indexOf(callback);
            if (idx >= 0) {
                listeners.splice(idx, 1);
            }
        };
    }

    function getState() {
        return currentState;
    }

    return { start, subscribe, getState };
})();