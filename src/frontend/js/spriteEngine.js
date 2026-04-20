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

    let interval = null;

    function play(img, character, mood, speed = 400) {
        if (!img) return;
        const frames = CHARACTERS?.[character]?.[mood];
        if (!frames || frames.length === 0) return;

        let i = 0;
        clearInterval(interval);
        
        // Immediate first frame
        img.src = frames[0];

        interval = setInterval(() => {
            i = (i + 1) % frames.length;
            img.src = frames[i];
        }, speed);
    }

    return { play, preload: () => {} }; // Preload logic kept simple
})();