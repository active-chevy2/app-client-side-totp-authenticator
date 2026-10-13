// Parsing for Bitwarden Authenticator (Android) JSON and CSV exports.
// Pure functions only: no DOM access, so they can be tested in Node.

const OTP_PREFIX = 'otpauth://';
const BASE32_PATTERN = /^[A-Z2-7\s=-]+$/i;

function safeDecode(value) {
    try {
        return decodeURIComponent(value);
    } catch (err) {
        return value;
    }
}

/**
 * Parse an otpauth://totp/... URI.
 * Returns null if the value is not a TOTP URI.
 */
function parseOtpauthUri(uri, fallbackName) {
    if (typeof uri !== 'string') return null;

    const trimmed = uri.trim();
    if (!trimmed.toLowerCase().startsWith(OTP_PREFIX)) return null;

    const rest = trimmed.slice(OTP_PREFIX.length);
    const queryIndex = rest.indexOf('?');
    const pathPart = queryIndex >= 0 ? rest.slice(0, queryIndex) : rest;
    const queryPart = queryIndex >= 0 ? rest.slice(queryIndex + 1) : '';

    const segments = pathPart.split('/');
    const type = segments[0].toLowerCase();
    if (type !== 'totp') return null; // HOTP and anything else is not supported

    const label = safeDecode(segments.slice(1).join('/'));
    const params = new URLSearchParams(queryPart);

    const secret = (params.get('secret') || '').replace(/\s+/g, '').toUpperCase();
    if (!secret) return null;

    // Label is usually "Issuer:account@example.com"
    let labelIssuer = '';
    let accountLabel = label;
    if (label.includes(':')) {
        labelIssuer = label.slice(0, label.indexOf(':')).trim();
        accountLabel = label.slice(label.indexOf(':') + 1).trim();
    }

    const issuer = params.get('issuer') || labelIssuer;
    const digits = parseInt(params.get('digits'), 10) || 6;
    const period = parseInt(params.get('period'), 10) || 30;
    const algorithm = (params.get('algorithm') || 'SHA1').toUpperCase();

    return {
        name: fallbackName || issuer || accountLabel || 'Unnamed',
        issuer: issuer,
        account: accountLabel,
        secret: secret,
        algorithm: algorithm,
        digits: digits,
        period: period
    };
}

/**
 * Parse a TOTP field value. Accepts an otpauth:// URI, or a bare base32 secret.
 */
function parseTotpField(value, name) {
    if (typeof value !== 'string' || !value.trim()) return null;

    if (value.trim().toLowerCase().startsWith(OTP_PREFIX)) {
        return parseOtpauthUri(value, name);
    }

    const compact = value.replace(/\s+/g, '');
    if (compact.length >= 16 && BASE32_PATTERN.test(compact)) {
        return {
            name: name || 'Unnamed',
            issuer: '',
            account: '',
            secret: compact.toUpperCase(),
            algorithm: 'SHA1',
            digits: 6,
            period: 30
        };
    }

    return null;
}

/**
 * Minimal RFC 4180 CSV parser (handles quoted fields, escaped quotes, CRLF).
 */
function parseCsvText(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += ch;
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function accountsFromCsv(text) {
    const rows = parseCsvText(text.replace(/^\uFEFF/, ''));
    if (rows.length === 0) return [];

    const header = rows[0].map(h => h.trim().toLowerCase());
    const hasHeader = header.includes('login_totp') || header.includes('name');
    const nameIdx = header.indexOf('name');
    const totpIdx = header.indexOf('login_totp');
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const accounts = [];
    for (const row of dataRows) {
        const name = nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : '';
        let account = null;

        if (totpIdx >= 0) {
            account = parseTotpField(row[totpIdx], name);
        }

        // Fallback: look for any column holding an otpauth:// URI
        if (!account) {
            const uriCell = row.find(cell => cell.trim().toLowerCase().startsWith(OTP_PREFIX));
            if (uriCell) account = parseOtpauthUri(uriCell, name);
        }

        if (account) accounts.push(account);
    }
    return accounts;
}

function accountsFromJson(text) {
    const data = JSON.parse(text);

    if (data && data.encrypted === true) {
        throw new Error('This is an encrypted export. Encrypted files are not supported yet. Export as unencrypted JSON.');
    }

    let items = [];
    if (Array.isArray(data)) {
        items = data;
    } else if (data && Array.isArray(data.items)) {
        items = data.items;
    }

    const accounts = [];
    for (const item of items) {
        if (!item || !item.login) continue;
        const account = parseTotpField(item.login.totp, item.name);
        if (account) accounts.push(account);
    }
    return accounts;
}

/**
 * Parse one uploaded file. Returns an array of accounts.
 * Throws a readable Error if the file cannot be read.
 */
function parseExportFile(fileName, text) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.json')) return accountsFromJson(text);
    if (lower.endsWith('.csv')) return accountsFromCsv(text);
    throw new Error(`Unsupported file type: ${fileName}`);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseOtpauthUri,
        parseTotpField,
        parseCsvText,
        accountsFromCsv,
        accountsFromJson,
        parseExportFile
    };
}
