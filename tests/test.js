// Run with: node tests/test.js
const assert = require('assert');
const crypto = require('crypto');

global.CryptoJS = require('../vendor/crypto-js.js');
const { base32ToBytes, generateTOTP } = require('../totp.js');
const { parseExportFile, parseTotpField } = require('../parser.js');

let passed = 0;
function test(name, fn) {
    fn();
    passed++;
    console.log('ok -', name);
}

function base32Encode(buffer) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0, value = 0, out = '';
    for (const byte of buffer) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
    return out;
}

// Independent reference using Node's built-in HMAC (not the code under test)
function referenceTotp(secretB32, timeMs, digits = 6, period = 30, algo = 'sha1') {
    const key = Buffer.from(base32ToBytes(secretB32));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(timeMs / 1000 / period)));
    const h = crypto.createHmac(algo, key).update(counter).digest();
    const o = h[h.length - 1] & 0x0f;
    const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
    return String(bin % 10 ** digits).padStart(digits, '0');
}

// RFC 6238 Appendix B test vectors (8 digits)
test('RFC 6238 SHA1 vectors', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    const vectors = [
        [59, '94287082'],
        [1111111109, '07081804'],
        [1111111111, '14050471'],
        [1234567890, '89005924'],
        [2000000000, '69279037'],
        [20000000000, '65353130']
    ];
    for (const [t, expected] of vectors) {
        const r = generateTOTP({ secret, digits: 8, period: 30, algorithm: 'SHA1' }, t * 1000);
        assert.strictEqual(r.code, expected, `SHA1 at t=${t}`);
    }
});

test('RFC 6238 SHA256 and SHA512 vectors', () => {
    const s256 = base32Encode(Buffer.from('12345678901234567890123456789012'));
    const s512 = base32Encode(Buffer.from('1234567890123456789012345678901234567890123456789012345678901234'));
    assert.strictEqual(generateTOTP({ secret: s256, digits: 8, algorithm: 'SHA256' }, 59000).code, '46119246');
    assert.strictEqual(generateTOTP({ secret: s512, digits: 8, algorithm: 'SHA512' }, 59000).code, '90693936');
});

test('remaining seconds count down correctly', () => {
    const r = generateTOTP({ secret: 'GEZDGNBVGY3TQOJQ' }, 59 * 1000);
    assert.strictEqual(r.remaining, 1); // 59 is 29s into the 30-30 window -> 1s left
});

test('base32 decoder rejects invalid characters', () => {
    assert.throws(() => base32ToBytes('ABC1'), /Invalid base32/);
});

// Sample files from the user (Bitwarden Authenticator exports)
const SAMPLE_CSV = `folder,favorite,type,name,login_uri,login_totp
,,1,elogic.synology.me,,otpauth://totp/elogic.synology.me%3Atest%40elogic.synology.me?secret=65TV7MIRZ5FV5MX24NVVXXD3MG7UDGPD&algorithm=SHA1&digits=6&period=30&issuer=elogic.synology.me,elogic.synology.me,30,6
,,1,totp@authenticationtest.com,,otpauth://totp/totp%40authenticationtest.com%3Atotp%40authenticationtest.com?secret=I65VU7K5ZQL7WB4E&algorithm=SHA1&digits=6&period=30&issuer=totp%40authenticationtest.com,totp@authenticationtest.com,30,6`;

const SAMPLE_JSON = JSON.stringify({
    encrypted: false,
    items: [
        {
            id: 'a8eb74eb-23b9-461b-a463-3bb564d71c2d',
            name: 'elogic.synology.me',
            folderId: null,
            notes: null,
            type: 1,
            login: { totp: 'otpauth://totp/elogic.synology.me%3Atest%40elogic.synology.me?secret=65TV7MIRZ5FV5MX24NVVXXD3MG7UDGPD&algorithm=SHA1&digits=6&period=30&issuer=elogic.synology.me' },
            favorite: false
        },
        {
            id: '25a75bf2-01d6-44d3-9801-1d0237d9c65e',
            name: 'totp@authenticationtest.com',
            folderId: null,
            notes: null,
            type: 1,
            login: { totp: 'otpauth://totp/totp%40authenticationtest.com%3Atotp%40authenticationtest.com?secret=I65VU7K5ZQL7WB4E&algorithm=SHA1&digits=6&period=30&issuer=totp%40authenticationtest.com' },
            favorite: false
        }
    ]
});

const EXPECTED = [
    { name: 'elogic.synology.me', account: 'test@elogic.synology.me', secret: '65TV7MIRZ5FV5MX24NVVXXD3MG7UDGPD' },
    { name: 'totp@authenticationtest.com', account: 'totp@authenticationtest.com', secret: 'I65VU7K5ZQL7WB4E' }
];

test('JSON export yields exactly 2 accounts (no duplicates)', () => {
    const accounts = parseExportFile('authenticator_export.json', SAMPLE_JSON);
    assert.strictEqual(accounts.length, 2);
    accounts.forEach((acc, i) => {
        assert.strictEqual(acc.name, EXPECTED[i].name);
        assert.strictEqual(acc.account, EXPECTED[i].account);
        assert.strictEqual(acc.secret, EXPECTED[i].secret);
        assert.strictEqual(acc.digits, 6);
        assert.strictEqual(acc.period, 30);
        assert.strictEqual(acc.algorithm, 'SHA1');
    });
});

test('CSV export yields exactly 2 accounts with the same secrets', () => {
    const accounts = parseExportFile('authenticator_export.csv', SAMPLE_CSV);
    assert.strictEqual(accounts.length, 2);
    accounts.forEach((acc, i) => {
        assert.strictEqual(acc.name, EXPECTED[i].name);
        assert.strictEqual(acc.secret, EXPECTED[i].secret);
    });
});

test('generated codes match an independent HMAC reference', () => {
    const now = Date.now();
    for (const acc of parseExportFile('a.json', SAMPLE_JSON)) {
        const ours = generateTOTP(acc, now).code;
        assert.strictEqual(ours, referenceTotp(acc.secret, now));
        assert.match(ours, /^\d{6}$/);
    }
});

test('encrypted JSON gives a clear error', () => {
    const encrypted = JSON.stringify({ encrypted: true, data: 'abc' });
    assert.throws(() => parseExportFile('x.json', encrypted), /encrypted export/i);
});

test('bare base32 secret is accepted', () => {
    const acc = parseTotpField('JBSWY3DPEHPK3PXP', 'Test');
    assert.strictEqual(acc.secret, 'JBSWY3DPEHPK3PXP');
});

test('unsupported file type is rejected', () => {
    assert.throws(() => parseExportFile('notes.txt', 'hello'), /Unsupported file type/);
});

console.log(`\n${passed} tests passed`);
