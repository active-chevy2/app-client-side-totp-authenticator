# 2FA Authenticator

A client-side web app that shows live 6-digit TOTP codes from exports made by the **Bitwarden Authenticator** Android app.

It runs entirely in the browser. Nothing is uploaded, and it works offline once loaded. That means you can keep the folder on a USB drive and open `index.html` on any computer.

## Supported files

- Unencrypted JSON export from Bitwarden Authenticator (Android)
- Unencrypted CSV export from Bitwarden Authenticator (Android)

Encrypted exports are not supported yet.

## Running it

**Directly (no Docker):** open `index.html` in a browser.

**With Docker:**

```bash
docker compose up -d
# then open http://localhost:8080
```

## Checking it works

Run the tests with Node 18 or newer:

```bash
node tests/test.js
```

They check the RFC 6238 test vectors, parse the sample export format, and compare the output against an independent HMAC calculation.

## Files

- `parser.js`: reads the JSON and CSV exports and extracts `otpauth://` secrets
- `totp.js`: RFC 6238 code generation (SHA1, SHA256, SHA512, 6 or 8 digits)
- `app.js`: file loading, live cards, search, copy
- `vendor/crypto-js.js`: HMAC library (MIT licence, bundled so no CDN is needed)

## Security notes

- Codes are generated from the secrets in your export, so anyone with the file can generate your codes. Treat the file like a password.
- Copy uses the Clipboard API when available, with a fallback for plain-HTTP LAN addresses.
