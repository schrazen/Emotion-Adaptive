window.tempWidget = 'pikachu';

window.getSelectedCharacter = async function() {
    if (window.api && window.api.getSelectedCharacter) {
        return window.api.getSelectedCharacter();
    }

    return 'pikachu';
};

window.setSelectedCharacter = async function(characterName) {
    const next = characterName || 'pikachu';
    if (window.api && window.api.setSelectedCharacter) {
        return window.api.setSelectedCharacter(next);
    }

    return next;
};

window.openModal = function(id) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(id);
    if (overlay && modal) {
        window.getSelectedCharacter().then((selected) => {
            window.tempWidget = selected;
            modal.querySelectorAll('.option-card').forEach((card) => {
                const onclickAttr = card.getAttribute('onclick') || '';
                card.classList.toggle('selected', onclickAttr.includes(`'${selected}'`));
            });
        });

        overlay.style.display = 'flex';
        document.querySelectorAll('.custom-modal').forEach(m => m.style.display = 'none');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeAllModals = function() {
    const overlay = document.getElementById('modal-overlay');
    const modals = document.querySelectorAll('.custom-modal');
    if (overlay) {
        modals.forEach(m => {
            if (m.style.display === 'block') {
                m.style.animation = 'modalSlideDown 0.3s cubic-bezier(0.32, 1, 0.67, 1) forwards';
            }
        });
        setTimeout(() => {
            overlay.style.display = 'none';
            modals.forEach(m => {
                m.style.display = 'none';
                m.style.animation = ''; 
            });
            document.body.style.overflow = '';
        }, 250); 
    }
};

window.selectWidgetOption = (element, widgetName) => {
    const container = element.closest('.modal-options-list');

    container.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });

    element.classList.add('selected');
    window.tempWidget = widgetName;
};

window.applyWidgetChange = async () => {
    if (window.tempWidget) {
        await window.setSelectedCharacter(window.tempWidget);
        const spriteImg = document.getElementById('mood-sprite');
        console.log(`EAUIS: Companion switched to ${window.tempWidget}`);
        window.dispatchEvent(new CustomEvent('character-changed', { detail: { character: window.tempWidget } }));
    }
    window.closeAllModals();
};