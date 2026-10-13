# 2FA Authenticator

<a href="https://www.aihonestybadge.com" target="_blank" rel="noopener"><img src="https://www.aihonestybadge.com/badges/ai-generated-large.svg" alt="AI Generated" height="28"></a>

A client-side web app that shows live 6-digit TOTP codes from exports made by the **Bitwarden Authenticator** Android app.

It runs entirely in the browser. Nothing is uploaded, and it works offline once loaded. Keep the folder on a USB drive and open `index.html` on any computer.

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

## Appearance

- **Colour theme:** choose Auto (follows your system), Light, or Dark at the top right. Your choice is remembered in this browser.
- **Design:** Material Design 3 with the default baseline colours (purple seed `#6750A4`). Dynamic colour from wallpaper is not used.
- **Font:** Roboto, bundled in `fonts/` so it works offline. If the files are missing, the page falls back to system fonts.

## Checking it works

Run the tests with Node 18 or newer:

```bash
node tests/test.js
```

They check the RFC 6238 test vectors, parse the sample export format, and compare the output against an independent HMAC calculation.

## Files

- `index.html`: page layout
- `style.css`: Material Design 3 colours, typography and components
- `theme.js`: Auto, Light and Dark theme switching
- `parser.js`: reads the JSON and CSV exports and extracts `otpauth://` secrets
- `totp.js`: RFC 6238 code generation (SHA1, SHA256, SHA512, 6 or 8 digits)
- `app.js`: file loading, live cards, search, copy
- `vendor/crypto-js.js`: HMAC library (MIT licence, bundled so no CDN is needed)
- `fonts/`: Roboto Latin fonts (SIL Open Font License 1.1, see `fonts/LICENSE-roboto.txt`)

## Security notes

- Codes are generated from the secrets in your export, so anyone with the file can generate your codes. Treat the file like a password.
- Copy uses the Clipboard API when available, with a fallback for plain-HTTP LAN addresses.
