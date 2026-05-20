/* =========================================
   SYSTEM.JS - shared context menu, reboot, toast.
   Loaded by index.html and 404.html before page scripts.
   Exposes MyBioSystem.* and a few backward-compat globals
   that are referenced from inline onclick= handlers.
   ========================================= */

(function () {
    'use strict';

    const TOAST_COOLDOWN = 1000;
    let lastToastTime = 0;
    let linkToCopy = null;

    function showToast(options) {
        const now = Date.now();
        if (now - lastToastTime < TOAST_COOLDOWN) return;
        lastToastTime = now;
        if (typeof window.iziToast !== 'undefined') {
            window.iziToast.show(options);
        }
    }

    function copyToClipboard(text) {
        if (!text) return Promise.resolve(false);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(() => true, () => false);
        }
        // Fallback for non-secure contexts
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return Promise.resolve(ok);
        } catch (e) {
            return Promise.resolve(false);
        }
    }

    function handleCopyAction() {
        const url = linkToCopy || window.location.href;
        copyToClipboard(url).then((ok) => {
            if (!ok) return;
            showToast({
                theme: 'dark',
                icon: 'fa-solid fa-link',
                title: 'Link',
                message: 'Copied',
                position: 'topCenter',
                progressBarColor: '#00ff88',
                timeout: 2000
            });
        });
    }

    function initContextMenu() {
        const contextMenu = document.getElementById('custom-context-menu');
        if (!contextMenu || contextMenu.dataset.bound === 'true') return;
        contextMenu.dataset.bound = 'true';

        document.addEventListener('contextmenu', (e) => {
            // Preserve native right-click inside form fields
            if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
                return;
            }
            e.preventDefault();

            const link = e.target.closest && e.target.closest('a');
            const copyLabel = document.getElementById('context-copy-text');
            if (copyLabel) copyLabel.textContent = link ? 'Copy Link Address' : 'Copy Site Link';
            linkToCopy = link ? link.href : window.location.href;

            // Show first so we can measure
            contextMenu.style.display = 'flex';
            const rect = contextMenu.getBoundingClientRect();
            const left = Math.min(e.clientX, window.innerWidth - rect.width - 10);
            const top = Math.min(e.clientY, window.innerHeight - rect.height - 10);
            contextMenu.style.left = `${Math.max(0, left)}px`;
            contextMenu.style.top = `${Math.max(0, top)}px`;
        });

        document.addEventListener('click', () => {
            contextMenu.style.display = 'none';
        });
    }

    function triggerReboot(onComplete) {
        const contextMenu = document.getElementById('custom-context-menu');
        if (contextMenu) contextMenu.style.display = 'none';

        const mainContainer = document.getElementById('main-container');
        if (mainContainer) mainContainer.classList.add('ui-hidden');

        const screen = document.getElementById('reboot-screen');
        const logs = document.getElementById('reboot-logs');
        if (!screen || !logs) return;
        logs.innerHTML = '';
        screen.classList.remove('hidden');
        screen.style.display = 'flex';

        const lines = [
            'SYSTEM_HALT: CRITICAL_PROCESS_DIED',
            'Collecting error info...',
            'Dumping physical memory to disk: 100%',
            'Clearing cache...',
            'Contacting admin...',
            'Initiating system restart...'
        ];

        let delay = 0;
        lines.forEach((line) => {
            setTimeout(() => {
                const p = document.createElement('div');
                p.textContent = `> ${line}`;
                logs.appendChild(p);
                window.scrollTo(0, document.body.scrollHeight);
            }, delay);
            delay += 300 + Math.random() * 400;
        });

        setTimeout(() => {
            if (typeof onComplete === 'function') onComplete();
            else location.reload();
        }, delay + 500);
    }

    function prefersReducedMotion() {
        try {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    }

    // Expose namespace + a few backward-compat globals so inline onclick="" still works
    window.MyBioSystem = {
        showToast,
        copyToClipboard,
        handleCopyAction,
        triggerReboot,
        initContextMenu,
        prefersReducedMotion,
        getLinkToCopy: () => linkToCopy,
        setLinkToCopy: (v) => { linkToCopy = v; }
    };
    window.showToast = showToast;
    window.handleCopyAction = handleCopyAction;
    window.triggerReboot = triggerReboot;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContextMenu);
    } else {
        initContextMenu();
    }
})();
