(() => {
    'use strict';

    const uploadSection = document.getElementById('upload-section');
    const fileInput = document.getElementById('file-input');
    const clearBtn = document.getElementById('clear-btn');
    const messageEl = document.getElementById('message');
    const controlsEl = document.getElementById('controls');
    const cardsSectionEl = document.getElementById('cards-section');
    const cardsEl = document.getElementById('cards');
    const emptyEl = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const totalEl = document.getElementById('total-count');

    let accounts = [];
    const seenKeys = new Set();

    fileInput.addEventListener('change', event => processFiles(event.target.files));
    clearBtn.addEventListener('click', clearSecrets);
    searchInput.addEventListener('input', renderCards);
    sortSelect.addEventListener('change', renderCards);

    // Drag-and-drop support on the upload card
    ['dragenter', 'dragover'].forEach(evtName => {
        uploadSection.addEventListener(evtName, event => {
            event.preventDefault();
            uploadSection.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(evtName => {
        uploadSection.addEventListener(evtName, event => {
            event.preventDefault();
            uploadSection.classList.remove('drag-over');
        });
    });

    uploadSection.addEventListener('drop', event => {
        const files = event.dataTransfer && event.dataTransfer.files;
        if (files && files.length > 0) processFiles(files);
    });

    async function processFiles(fileList) {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;

        const loaded = [];
        const problems = [];

        for (const file of files) {
            try {
                const text = await file.text();
                loaded.push(...parseExportFile(file.name, text));
            } catch (err) {
                problems.push(`${file.name}: ${err.message}`);
            }
        }

        let addedCount = 0;
        for (const account of loaded) {
            const key = `${account.secret}|${account.name}|${account.account}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);
            accounts.push(account);
            addedCount++;
        }

        updateVisibility();

        if (problems.length > 0) {
            showMessage(problems.join(' | '), 'error');
        } else if (addedCount > 0) {
            showMessage(`Loaded ${addedCount} new 2FA account(s). Total: ${accounts.length}.`, 'success');
        } else if (loaded.length > 0) {
            showMessage('All accounts in the selected file(s) are already loaded.', 'success');
        } else {
            showMessage('No 2FA codes found in these files. Make sure they are Bitwarden Authenticator exports.', 'error');
        }

        // Allow picking the same file again later
        fileInput.value = '';
    }

    function clearSecrets() {
        for (const acc of accounts) {
            acc.secret = '';
            acc.current = '';
            acc.ui = null;
        }
        accounts = [];
        seenKeys.clear();
        searchInput.value = '';
        cardsEl.textContent = '';
        updateVisibility();
        showMessage('Cleared all secrets from memory.', 'success');
    }

    function updateVisibility() {
        const hasAccounts = accounts.length > 0;
        controlsEl.hidden = !hasAccounts;
        cardsSectionEl.hidden = !hasAccounts;
        clearBtn.hidden = !hasAccounts;
        emptyEl.hidden = hasAccounts;
        if (hasAccounts) renderCards();
    }

    function getSortedFilteredAccounts() {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = accounts.filter(acc =>
            !query || `${acc.name} ${acc.account} ${acc.issuer}`.toLowerCase().includes(query)
        );

        const sortMode = sortSelect.value;
        if (sortMode === 'name') {
            return [...filtered].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        }
        if (sortMode === 'account') {
            return [...filtered].sort((a, b) =>
                (a.account || a.name).localeCompare(b.account || b.name, undefined, { sensitivity: 'base' })
            );
        }
        return filtered;
    }

    function renderCards() {
        const visible = getSortedFilteredAccounts();

        cardsEl.textContent = '';
        for (const acc of accounts) acc.ui = null;

        for (const acc of visible) {
            const card = buildCard(acc);
            cardsEl.appendChild(card);
        }

        totalEl.textContent = visible.length === accounts.length
            ? String(accounts.length)
            : `${visible.length} / ${accounts.length}`;

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

        const codeEl = document.createElement('button');
        codeEl.type = 'button';
        codeEl.className = 'code-main';
        codeEl.title = 'Click to copy code';
        codeEl.textContent = '--- ---';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy';

        const triggerCopy = () => copyText(acc.current || '', copyBtn);
        codeEl.addEventListener('click', triggerCopy);
        copyBtn.addEventListener('click', triggerCopy);

        row.append(codeEl, copyBtn);

        const bar = document.createElement('div');
        bar.className = 'time-bar';
        const fill = document.createElement('div');
        fill.className = 'time-fill';
        bar.appendChild(fill);

        const timeText = document.createElement('div');
        timeText.className = 'time-text';

        card.append(name, sub, row, bar, timeText);
        acc.ui = { card, codeEl, fill, timeText };
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
                acc.ui.card.classList.toggle('expiring', result.remaining <= 5);
            } catch (err) {
                acc.current = '';
                acc.ui.codeEl.textContent = 'Error';
                acc.ui.timeText.textContent = err.message;
                acc.ui.card.classList.remove('expiring');
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
