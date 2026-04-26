window.SpriteEngine = (function () {
    const CHARACTERS = {
        pikachu: {
            happy: [
                "../assets/sprites/pikachu/pikachu_happy1.png",
                "../assets/sprites/pikachu/pikachu_happy2.png"
            ],
            neutral: [
                "../assets/sprites/pikachu/pikachu_neutral1.png",
                "../assets/sprites/pikachu/pikachu_neutral2.png"
            ],
            angry: [
                "../assets/sprites/pikachu/pikachu_angry1.png",
                "../assets/sprites/pikachu/pikachu_angry2.png"
            ]
        },
        kirby: {
            happy: [
                "../assets/sprites/kirby/kirby_happy1.png",
                "../assets/sprites/kirby/kirby_happy2.png"
            ],
            neutral: [
                "../assets/sprites/kirby/kirby_neutral1.png",
                "../assets/sprites/kirby/kirby_neutral2.png"
            ],
            angry: [
                "../assets/sprites/kirby/kirby_angry1.png",
                "../assets/sprites/kirby/kirby_angry2.png"
            ]
        },
        bmo: {
            happy: [
                "../assets/sprites/bmo/bmo_happy1.png",
                "../assets/sprites/bmo/bmo_happy2.png"
            ],
            neutral: [
                "../assets/sprites/bmo/bmo_neutral1.png",
                "../assets/sprites/bmo/bmo_neutral2.png"
            ],
            angry: [
                "../assets/sprites/bmo/bmo_angry1.png",
                "../assets/sprites/bmo/bmo_angry2.png"
            ]
        }
    };

    const STATIC_FRAME_MS = 420;
    const players = new WeakMap();

    function play(img, character, mood, _speed = STATIC_FRAME_MS) {
        if (!img) return;
        const frames = CHARACTERS?.[character]?.[mood];
        if (!frames || frames.length === 0) return;

        const nextSignature = `${character}:${mood}`;
        const existing = players.get(img);
        if (existing && existing.signature === nextSignature) {
            return;
        }

        if (existing && existing.intervalId) {
            clearInterval(existing.intervalId);
        }

        let i = 0;

        // Immediate first frame
        img.src = frames[0];

        const intervalId = setInterval(() => {
            i = (i + 1) % frames.length;
            img.src = frames[i];
        }, STATIC_FRAME_MS);

        players.set(img, {
            signature: nextSignature,
            intervalId,
        });
    }

    return { play, preload: () => {} };
})();