async function loadPage(page) {
    const container = document.getElementById("main-content");
    // Target by class since your HTML uses class="settings-fab"
    const settingsBtn = document.querySelector(".settings-fab"); 
    const navItems = document.querySelectorAll(".nav-item");

    try {
        const html = await window.api.getPageContent(page);
        container.innerHTML = html;

        // 1. Handle Navigation Items (Home, History)
        navItems.forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick');
            // Checks if the button's click function matches the current page name
            if (onclickAttr && onclickAttr.includes(`'${page}'`)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 2. Handle Settings FAB Inversion
        if (settingsBtn) {
            if (page === 'settings') {
                settingsBtn.classList.add('is-active');
            } else {
                settingsBtn.classList.remove('is-active');
            }
        }

        // 3. Script Execution Logic
        // This finds any <script> tags inside your injected HTML and re-runs them
        const scripts = container.querySelectorAll("script");
        scripts.forEach(oldScript => {
            const newScript = document.createElement("script");
            
            // Copy attributes (src, type, etc.)
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });

            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                newScript.textContent = oldScript.textContent;
            }

            // Append to body to trigger execution, then clean up the old one
            document.body.appendChild(newScript);
            oldScript.remove();
            
            // Optional: Remove the injected script after execution to keep DOM clean
            setTimeout(() => newScript.remove(), 100);
        });

    } catch (error) {
        console.error("Navigation error:", error);
    }
}

// Load home on startup
document.addEventListener("DOMContentLoaded", () => {
    loadPage('home');
});