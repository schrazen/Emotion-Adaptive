window.tempWidget = 'pikachu'; 

window.openModal = function(id) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById(id);
    if (overlay && modal) {
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

window.applyWidgetChange = () => {
    if (window.tempWidget) {
        const spriteImg = document.getElementById('mood-sprite');
        console.log(`EAUIS: Companion switched to ${window.tempWidget}`);
    }
    window.closeAllModals();
};