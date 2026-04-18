let tempTheme = '';
let tempAccent = '';

window.openModal = function(id) {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById(id).style.display = 'block';
};

window.closeAllModals = function() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.querySelectorAll('.custom-modal').forEach(m => m.style.display = 'none');
};

window.selectAccentItem = (element, accent) => {
    document.querySelectorAll('[data-accent]').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    tempAccent = accent;
};

window.applyAccentChanges = () => {
    if (tempAccent) {
        // Remove all possible accent classes
        document.body.classList.remove('accent-blue', 'accent-red', 'accent-plain');
        document.body.classList.add(`accent-${tempAccent}`);
    }
    closeAllModals();
};