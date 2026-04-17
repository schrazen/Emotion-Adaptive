async function loadPage(page) {
    const container = document.getElementById("main-content");
    const settingsBtn = document.getElementById("settings-btn");
    const navItems = document.querySelectorAll(".nav-item");

    try {
        const html = await window.api.getPageContent(page);
        container.innerHTML = html;

        navItems.forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${page}'`)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (page === 'settings') {
            settingsBtn.classList.add('is-active');
        } else {
            settingsBtn.classList.remove('is-active');
        }

        // 4. Load Page-Specific JS (Cleanup old first)
        const oldScript = document.getElementById("page-script");
        if (oldScript) oldScript.remove();

        const script = document.createElement("script");
        script.id = "page-script"; 
        script.src = `../js/${page}.js`;
        script.defer = true;
        document.body.appendChild(script);

    } catch (error) {
        console.error("Navigation error:", error);
    }
}

// Load home on startup
document.addEventListener("DOMContentLoaded", () => {
    loadPage('home');
});