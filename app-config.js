// Applies config.json (title, description, logo and icon) to the page,
// then registers the service worker so the app can run offline.
(() => {
    'use strict';

    const CONFIG_URL = 'config.json';

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
        const logo = document.getElementById('app-logo');
        if (logo) {
            logo.src = url;
            logo.hidden = false;
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
        if (config.title) document.title = config.title;
        setText('app-title', config.title);
        setText('app-description', config.description);
        setMeta('description', config.description);
        setMeta('apple-mobile-web-app-title', config.short_name || config.title);
        if (config.icon_url) setIcon(config.icon_url);
    }

    fetch(CONFIG_URL, { cache: 'no-cache' })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(applyConfig)
        .catch(err => console.warn('config.json not loaded, using the built-in text:', err));

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .catch(err => console.warn('Offline support not available:', err));
        });
    }
})();
