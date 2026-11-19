# 2FA Authenticator

<a href="https://www.aihonestybadge.com" target="_blank" rel="noopener"><img src="https://www.aihonestybadge.com/badges/ai-generated-large.svg" alt="AI Generated" height="28"></a>

A client-side web app that shows live TOTP codes from exports made by the **Bitwarden Authenticator** Android app.

It runs entirely in the browser. Nothing is uploaded, and it works offline once loaded. Keep the folder on a USB drive and open `index.html` on any computer.

## Supported files

- Unencrypted JSON export from Bitwarden Authenticator (Android)
- Unencrypted CSV export from Bitwarden Authenticator (Android)

Encrypted exports are not supported yet.

## Configuration

Edit `config.json` to change the app's title, description, logo and install name:

| Key | Used for |
|---|---|
| `title` | Page title and heading |
| `description` | Text under the heading |
| `short_name` | Name shown under the icon when installed |
| `icon_url` | Logo in the page and the installed app icon (local path or `https://` image) |
| `icon_size` | Size declared for the icon, for example `256x256` |

Values must be plain text, with no double quotes or backslashes.

**When changes take effect:**

- Title, description and logo: reload the page.
- Installed app name and icon: restart the container (`docker compose restart`). The app's manifest is rebuilt at start-up.
- Without Docker: edit `manifest.webmanifest` by hand to match.

## Running it

**Directly (no Docker):** open `index.html` in a browser. Installing as an app needs HTTPS or `localhost`.

**With Docker:**

```bash
docker compose up -d --build
# then open http://localhost:8080 (or set PORT=9000 before starting)

```

## Install as an app (PWA)

Open the app over HTTPS or `localhost`, then use your browser's install option (for example "Install app" in Chrome or Edge, or "Add to Home Screen" on iPhone and Android).

## Offline use

On the first visit, the app's files, `config.json` and the Roboto fonts are stored by the browser. After that the app opens without internet.

* Your loaded secrets are never stored or cached. Files are read in memory, and you load them again each visit or wipe them immediately with **Clear secrets**.
* External logos (`https://`) are cached the first time they load. If never loaded while online, the app still works offline.

## Checking it works

Run the tests with Node 18 or newer:

```bash
node tests/test.js

```

They check the RFC 6238 test vectors, parse the sample export format, and compare the output against an independent HMAC calculation.

## Files

* `index.html`: page layout
* `config.json`: title, description and logo settings
* `app-config.js`: applies `config.json` to the page and registers the service worker
* `sw.js`: service worker for offline use
* `manifest.webmanifest`: app install details (rebuilt from `config.json` when the Docker container starts)
* `style.css`: Material Design 3 colours, typography and components
* `theme.js`: Auto, Light and Dark theme switching
* `parser.js`: reads the JSON and CSV exports and extracts `otpauth://` secrets
* `totp.js`: RFC 6238 code generation (SHA1, SHA256, SHA512, 6 or 8 digits)
* `app.js`: file loading, drag-and-drop, live cards, search, sort, copy, memory clear
* `docker/40-generate-manifest.sh`: builds the manifest from `config.json` at container start
* `vendor/crypto-js.js`: HMAC library (MIT licence, bundled so no CDN is needed)
* `fonts/`: Roboto Latin fonts (SIL Open Font License 1.1, see `fonts/LICENSE-roboto.txt`)

## Security notes

* Codes are generated from the secrets in your export, so anyone with the file can generate your codes. Treat the file like a password.
* Copy uses the Clipboard API when available, with a fallback for plain-HTTP LAN addresses.
