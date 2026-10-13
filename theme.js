// Colour theme: Auto (follows the system), Light, or Dark.
// Loaded in <head> so the saved theme is applied before the page is painted.
(() => {
    'use strict';

    const STORAGE_KEY = 'totp-theme';
    const CHOICES = ['auto', 'light', 'dark'];
    // Matches the surface colour of each scheme (used for the browser UI colour)
    const THEME_COLOURS = { light: '#FFFBFE', dark: '#1C1B1F' };

    const root = document.documentElement;
    const systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function loadChoice() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return CHOICES.includes(saved) ? saved : 'auto';
        } catch (err) {
            // Storage can be blocked (for example in some private windows). Use Auto.
            return 'auto';
        }
    }

    function saveChoice(choice) {
        try {
            localStorage.setItem(STORAGE_KEY, choice);
        } catch (err) {
            // Not saved, but the choice still applies for this visit.
        }
    }

    function effectiveTheme(choice) {
        if (choice === 'auto') {
            return systemDark && systemDark.matches ? 'dark' : 'light';
        }
        return choice;
    }

    function applyChoice(choice) {
        root.setAttribute('data-theme', choice);

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', THEME_COLOURS[effectiveTheme(choice)]);
        }

        document.querySelectorAll('[data-theme-value]').forEach(btn => {
            btn.setAttribute('aria-pressed', String(btn.dataset.themeValue === choice));
        });
    }

    // Apply straight away (runs in <head>, before the first paint)
    applyChoice(loadChoice());

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-theme-value]').forEach(btn => {
            btn.addEventListener('click', () => {
                const choice = btn.dataset.themeValue;
                if (!CHOICES.includes(choice)) return;
                saveChoice(choice);
                applyChoice(choice);
            });
        });

        // Buttons exist now, so set their pressed state
        applyChoice(loadChoice());
    });

    // In Auto mode, follow the system when it changes (for example at sunset)
    if (systemDark) {
        const onSystemChange = () => {
            if (loadChoice() === 'auto') applyChoice('auto');
        };
        if (systemDark.addEventListener) {
            systemDark.addEventListener('change', onSystemChange);
        } else if (systemDark.addListener) {
            systemDark.addListener(onSystemChange);
        }
    }
})();
