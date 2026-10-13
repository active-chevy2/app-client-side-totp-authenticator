// TOTP (RFC 6238) on top of HMAC from crypto-js.
// Works in the browser (global CryptoJS) and in Node (require).

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBytes(input) {
    const clean = String(input).replace(/[\s=-]/g, '').toUpperCase();
    const bytes = [];
    let buffer = 0;
    let bitCount = 0;

    for (const ch of clean) {
        const index = BASE32_CHARS.indexOf(ch);
        if (index === -1) {
            throw new Error(`Invalid base32 character "${ch}" in secret`);
        }
        buffer = ((buffer << 5) | index) & 0xffffff;
        bitCount += 5;
        if (bitCount >= 8) {
            bitCount -= 8;
            bytes.push((buffer >>> bitCount) & 0xff);
        }
    }
    return bytes;
}

function bytesToHex(bytes) {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
    const out = [];
    for (let i = 0; i < hex.length; i += 2) {
        out.push(parseInt(hex.substr(i, 2), 16));
    }
    return out;
}

// 8-byte big-endian encoding of the time counter
function counterToHex(counter) {
    const high = Math.floor(counter / 0x100000000);
    const low = counter >>> 0;
    return high.toString(16).padStart(8, '0') + low.toString(16).padStart(8, '0');
}

const HMAC_FUNCTIONS = {
    SHA1: () => CryptoJS.HmacSHA1,
    SHA256: () => CryptoJS.HmacSHA256,
    SHA512: () => CryptoJS.HmacSHA512
};

/**
 * Generate a TOTP code.
 * @param {Object} account - { secret, algorithm?, digits?, period? }
 * @param {number} timeMs - Unix time in milliseconds (defaults to now)
 * @returns {{code: string, remaining: number, period: number}}
 */
function generateTOTP(account, timeMs = Date.now()) {
    const algorithm = (account.algorithm || 'SHA1').toUpperCase();
    const digits = account.digits || 6;
    const period = account.period || 30;

    const hmacFn = HMAC_FUNCTIONS[algorithm] && HMAC_FUNCTIONS[algorithm]();
    if (!hmacFn) {
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    const keyBytes = base32ToBytes(account.secret);
    if (keyBytes.length === 0) {
        throw new Error('Secret is empty');
    }

    const timeSeconds = Math.floor(timeMs / 1000);
    const counter = Math.floor(timeSeconds / period);

    const key = CryptoJS.enc.Hex.parse(bytesToHex(keyBytes));
    const message = CryptoJS.enc.Hex.parse(counterToHex(counter));
    const hmac = hmacFn(message, key);
    const bytes = hexToBytes(hmac.toString(CryptoJS.enc.Hex));

    // Dynamic truncation (RFC 4226 section 5.3)
    const offset = bytes[bytes.length - 1] & 0x0f;
    const binary =
        ((bytes[offset] & 0x7f) << 24) |
        ((bytes[offset + 1] & 0xff) << 16) |
        ((bytes[offset + 2] & 0xff) << 8) |
        (bytes[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, digits);

    return {
        code: String(otp).padStart(digits, '0'),
        remaining: period - (timeSeconds % period),
        period: period
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { base32ToBytes, generateTOTP };
}
