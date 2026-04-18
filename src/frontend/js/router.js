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
        // Run scripts in order and wait for external scripts to finish loading before inline scripts execute.
        const scripts = Array.from(container.querySelectorAll('script'));
        for (const oldScript of scripts) {
            const newScript = document.createElement('script');

            Array.from(oldScript.attributes).forEach((attr) => {
                newScript.setAttribute(attr.name, attr.value);
            });

            if (oldScript.src) {
                await new Promise((resolve, reject) => {
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                    newScript.src = oldScript.src;
                    document.body.appendChild(newScript);
                });
            } else {
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript);
            }

            oldScript.remove();
        }

    } catch (error) {
        console.error("Navigation error:", error);
    }
}

// Load home on startup
document.addEventListener("DOMContentLoaded", () => {
    loadPage('home');
});