(() => {
    'use strict';

    const fileInput = document.getElementById('file-input');
    const messageEl = document.getElementById('message');
    const controlsEl = document.getElementById('controls');
    const cardsSectionEl = document.getElementById('cards-section');
    const cardsEl = document.getElementById('cards');
    const emptyEl = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const totalEl = document.getElementById('total-count');

    let accounts = [];

    fileInput.addEventListener('change', handleFiles);
    searchInput.addEventListener('input', renderCards);

    async function handleFiles(event) {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const loaded = [];
        const problems = [];

        // Wait for every file before checking results.
        for (const file of files) {
            try {
                const text = await file.text();
                loaded.push(...parseExportFile(file.name, text));
            } catch (err) {
                problems.push(`${file.name}: ${err.message}`);
            }
        }

        // Remove duplicates (same secret and name across files)
        const seen = new Set();
        accounts = [];
        for (const account of loaded) {
            const key = account.secret + '|' + account.name;
            if (seen.has(key)) continue;
            seen.add(key);
            accounts.push(account);
        }

        if (accounts.length > 0) {
            controlsEl.hidden = false;
            cardsSectionEl.hidden = false;
            emptyEl.hidden = true;
            renderCards();
        } else {
            controlsEl.hidden = true;
            cardsSectionEl.hidden = true;
            emptyEl.hidden = false;
        }

        if (problems.length > 0) {
            showMessage(problems.join(' | '), 'error');
        } else if (accounts.length > 0) {
            showMessage(`Loaded ${accounts.length} 2FA account(s).`, 'success');
        } else {
            showMessage('No 2FA codes found in these files. Make sure they are Bitwarden Authenticator exports.', 'error');
        }

        // Allow picking the same file again later
        fileInput.value = '';
    }

    function renderCards() {
        const query = searchInput.value.trim().toLowerCase();
        const visible = accounts.filter(acc =>
            !query || `${acc.name} ${acc.account} ${acc.issuer}`.toLowerCase().includes(query)
        );

        cardsEl.textContent = '';
        for (const acc of accounts) acc.ui = null;

        for (const acc of visible) {
            const card = buildCard(acc);
            cardsEl.appendChild(card);
        }

        totalEl.textContent = accounts.length;
        tick();
    }

    function buildCard(acc) {
        const card = document.createElement('article');
        card.className = 'code-card';

        const name = document.createElement('div');
        name.className = 'account-name';
        name.textContent = acc.name;

        const sub = document.createElement('div');
        sub.className = 'account-sub';
        sub.textContent = acc.account || acc.issuer || '';

        const row = document.createElement('div');
        row.className = 'code-row';

        const codeEl = document.createElement('div');
        codeEl.className = 'code-main';
        codeEl.textContent = '--- ---';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', () => copyText(acc.current || '', copyBtn));

        row.append(codeEl, copyBtn);

        const bar = document.createElement('div');
        bar.className = 'time-bar';
        const fill = document.createElement('div');
        fill.className = 'time-fill';
        bar.appendChild(fill);

        const timeText = document.createElement('div');
        timeText.className = 'time-text';

        card.append(name, sub, row, bar, timeText);
        acc.ui = { codeEl, fill, timeText };
        return card;
    }

    function tick() {
        const now = Date.now();
        for (const acc of accounts) {
            if (!acc.ui) continue;
            try {
                const result = generateTOTP(acc, now);
                acc.current = result.code;
                acc.ui.codeEl.textContent = formatCode(result.code);
                acc.ui.fill.style.width = (result.remaining / result.period * 100) + '%';
                acc.ui.timeText.textContent = result.remaining + 's';
            } catch (err) {
                acc.current = '';
                acc.ui.codeEl.textContent = 'Error';
                acc.ui.timeText.textContent = err.message;
            }
        }
    }

    function formatCode(code) {
        const half = Math.ceil(code.length / 2);
        return code.slice(0, half) + ' ' + code.slice(half);
    }

    async function copyText(text, button) {
        if (!text) return;

        let copied = false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                copied = true;
            }
        } catch (err) {
            copied = false;
        }

        // Fallback for plain-HTTP LAN addresses where the Clipboard API is unavailable
        if (!copied) {
            const area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            copied = document.execCommand('copy');
            document.body.removeChild(area);
        }

        const original = button.textContent;
        button.textContent = copied ? 'Copied!' : 'Failed';
        button.classList.toggle('copied', copied);
        setTimeout(() => {
            button.textContent = original;
            button.classList.remove('copied');
        }, 1500);
    }

    function showMessage(message, type) {
        messageEl.textContent = message;
        messageEl.className = 'message ' + type;
        messageEl.hidden = false;
    }

    // Refresh codes twice a second so period changes show within ~0.5s
    setInterval(tick, 500);
})();
