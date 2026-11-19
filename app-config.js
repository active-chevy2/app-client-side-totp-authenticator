// Applies config.json (title, description, logo and icon) to the page,
// then registers the service worker so the app can run offline.
(() => {
    'use strict';

    const CONFIG_URL = 'config.json';

    const logo = document.getElementById('app-logo');
    if (logo) {
        logo.addEventListener('error', () => {
            logo.hidden = true;
        });
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el && value) el.textContent = value;
    }

    function setMeta(name, content) {
        if (!content) return;
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    function setIcon(url) {
        if (logo) {
            logo.hidden = false;
            logo.src = url;
        }
        ['icon', 'apple-touch-icon'].forEach(rel => {
            let link = document.querySelector(`link[rel="${rel}"]`);
            if (!link) {
                link = document.createElement('link');
                link.rel = rel;
                document.head.appendChild(link);
            }
            link.href = url;
        });
    }

    function applyConfig(config) {
        if (!config || typeof config !== 'object') return;
        if (config.title) document.title = config.title;
        setText('app-title', config.title);
        setText('app-description', config.description);
        setMeta('description', config.description);
        setMeta('apple-mobile-web-app-title', config.short_name || config.title);
        if (config.icon_url) setIcon(config.icon_url);
    }

    // Fetch config.json when served over HTTP(S); on file://, keep the built-in defaults
    if (window.location.protocol !== 'file:') {
        fetch(CONFIG_URL, { cache: 'no-cache' })
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(applyConfig)
            .catch(err => console.warn('config.json not loaded, using built-in defaults:', err));
    }

    const canUseServiceWorker =
        'serviceWorker' in navigator &&
        (window.location.protocol === 'https:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1');

    if (canUseServiceWorker) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .catch(err => console.warn('Offline support not available:', err));
        });
    }
})();
