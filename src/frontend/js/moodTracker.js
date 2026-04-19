window.MoodTracker = (function () {
    const keyTimestamps = [];
    const backspaceTimestamps = [];
    const joyTimestamps = [];
    const listeners = [];

    const JOY_PATTERNS = [
        /(^|\W)lol(\W|$)/i, /(^|\W)lmao(\W|$)/i, /(^|\W)rofl(\W|$)/i,
        /h[ae]{1,}h[ae]{1,}/i, /ha(ha){2,}/i, /(^|\W)hehe+/i, /(^|\W)wkwk+/i,
        /😂|🤣|😆|😄|😀|😁|😹/
    ];

    const FRUSTRATION_PATTERNS = [
        { name: 'punctuation-abuse', regex: /[!?]{3,}/, weight: 1 },
        { name: 'elongation', regex: /(.)\1{4,}/i, weight: 2 },
        { name: 'digital-shout', regex: /[A-Z]{6,}/, weight: 2 },
        { name: 'rage-lexicon', regex: /(^|\W)(fuck|shit|damn|argh|ugh|hate|stupid)(\W|$)/i, weight: 3 }
    ];

    const MASH_ROW_DEFS = [
        {
            name: 'mash-home-row',
            sequences: ['asdfg', 'sdfgh', 'dfghj', 'fghjk', 'ghjkl', 'lkjhg', 'kjhgf', 'jhgfd', 'hgfds', 'gfdsa']
        },
        {
            name: 'mash-top-row',
            sequences: ['qwert', 'werty', 'ertyu', 'rtyui', 'tyuio', 'yuiop', 'poiuy', 'oiuyt', 'iuytr', 'uytre', 'ytrew', 'trewq']
        },
        {
            name: 'mash-bottom-row',
            sequences: ['zxcvb', 'xcvbn', 'cvbnm', 'mnbvc', 'nbvcx', 'bvcxz']
        }
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
    const MOOD_COOLDOWN_MS = 3000;

    let globalInputHooked = false;
    let started = false;
    let lastDebugLogAt = 0;
    let logPathPrinted = false;
    let lastFrustrationSignalAt = 0;

    const JOY_WINDOW_MS = 2800;
    const JOY_RETRIGGER_GAP_MS = 1400;
    const HAPPY_LINGER_MS = 450;
    const TEXT_TAIL_WINDOW = 36;
    const TEXT_SIGNAL_ACTIVITY_MAX_AGE_MS = 1800;

    const DEBUG_MOOD_LOGS = true;

    function debugLog(payload, force = false) {
        if (!DEBUG_MOOD_LOGS) {
            return;
        }

        const now = Date.now();
        if (!force && now - lastDebugLogAt < 800) {
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
        trimWindow(keyTimestamps, 60000);
        trimWindow(backspaceTimestamps, 60000);

        const rawApm = keyTimestamps.length;

        smoothedApm = smoothedApm === 0
            ? rawApm
            : (smoothedApm * 0.8) + (rawApm * 0.2);

        // Burst estimate from the most recent 2 seconds.
        const now = Date.now();
        const burstCount = keyTimestamps.filter((ts) => ts >= now - 2000).length;
        const burstApm = burstCount * 30;

        // Baseline from 12s..2s ago to detect sudden acceleration.
        const baselineCount = keyTimestamps.filter((ts) => ts >= now - 12000 && ts < now - 2000).length;
        const baselineApm = Math.round((baselineCount / 10) * 60);

        // Soft cap to keep displayed APM in realistic human range.
        const normalizedApm = Math.min(Math.round(smoothedApm), 360);

        let errorRate = 0;
        if (rawApm > 10) {
            errorRate = (backspaceTimestamps.length / rawApm) * 100;
        }

        return {
            apm: normalizedApm,
            errorRate,
            burstApm,
            baselineApm,
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
        MASH_ROW_DEFS.forEach(({ name, sequences }) => {
            const hasRowWalk = sequences.some((seq) => lowerTail.includes(seq));
            if (hasRowWalk) {
                score += 2;
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

    function moodFromSignals(apm, errorRate, burstApm, baselineApm) {
        const now = Date.now();
        const timeSinceLastChange = now - lastMoodChangeAt;
        const joyActive = hasRecentJoySignal();
        const burstDelta = burstApm - baselineApm;
        const frustrationText = detectFrustrationFromBuffer();

        const isFrustratedByText = frustrationText.score >= 3 || (frustrationText.score >= 2 && errorRate >= 12);

        if (isFrustratedByText && (now - lastFrustrationSignalAt > 1200)) {
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

        // Angry signal: sustained very high speed or sudden burst.
        const speedScore = [
            apm >= 230,
            apm >= 180 && errorRate >= 16,
            burstApm >= 420 && burstDelta >= 220,
            burstApm >= 520,
            errorRate >= 24,
        ].filter(Boolean).length;

        const isSustainedAngry = apm >= 230 && errorRate >= 12;
        const isSuddenBurstAngry = burstApm >= 420 && burstDelta >= 220 && errorRate >= 10;
        const isFrustratedBySpeed = (isSustainedAngry || isSuddenBurstAngry) && speedScore >= 2;

        // Text frustration can override joy because it indicates explicit negative sentiment.
        const isFrustrated = isFrustratedByText || (!joyActive && isFrustratedBySpeed);

        let targetMood = 'Neutral';

        if (isFrustrated) {
            targetMood = 'Angry';
        } else if (joyActive) {
            targetMood = 'Happy';
        } else if (currentState.mood === 'Happy' && timeSinceLastChange < HAPPY_LINGER_MS) {
            // Keep happy only briefly to avoid stale joy lock.
            targetMood = 'Happy';
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
                        isSustainedAngry,
                        isSuddenBurstAngry,
                        isFrustratedBySpeed,
                        isFrustratedByText,
                        speedScore,
                        isFrustrated,
                        frustrationTextScore: frustrationText.score,
                        frustrationTextMatches: frustrationText.matches,
                        frustrationTextAgeMs: frustrationText.textAgeMs,
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
                    isSustainedAngry,
                    isSuddenBurstAngry,
                    isFrustratedBySpeed,
                    isFrustratedByText,
                    speedScore,
                    isFrustrated,
                    frustrationTextScore: frustrationText.score,
                    frustrationTextMatches: frustrationText.matches,
                    frustrationTextAgeMs: frustrationText.textAgeMs,
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
                isSustainedAngry,
                isSuddenBurstAngry,
                isFrustratedBySpeed,
                isFrustratedByText,
                speedScore,
                isFrustrated,
                frustrationTextScore: frustrationText.score,
                frustrationTextMatches: frustrationText.matches,
                frustrationTextAgeMs: frustrationText.textAgeMs,
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
            const decision = moodFromSignals(metrics.apm, metrics.errorRate, metrics.burstApm, metrics.baselineApm);
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
            const decision = moodFromSignals(metrics.apm, metrics.errorRate, metrics.burstApm, metrics.baselineApm);
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
                    smoothedApm = latest.apm;
                    emit({ mood: latest.computed_mood, apm: latest.apm });
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