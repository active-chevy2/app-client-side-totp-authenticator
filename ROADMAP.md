# Roadmap

<a href="https://www.aihonestybadge.com" target="_blank" rel="noopener"><img src="https://www.aihonestybadge.com/badges/ai-assisted-large.svg" alt="AI Assisted" height="28"></a>

## Where we are

A read-only viewer for unencrypted Bitwarden Authenticator JSON and CSV exports. It shows live TOTP codes, supports search and copy, and works offline as an installable app (PWA). It is configured through `config.json`.

## Direction

Our own encrypted file format is the core of the app. It works like a physical key: keep the file on a USB drive, enter the password, and the codes open. Bitwarden Authenticator files become one import and export option among others, not the model the app is built around.

## Decisions made

- **Format inside the locked file:** JSON. The app can also read plain CSV and JSON files (including Bitwarden ones) and convert them into the locked format.
- **Unlocking:** memorised password only for now. A printed recovery key will be added later. The file format leaves room for a second key so this can be added without breaking saved files.
- **Key derivation:** PBKDF2 with SHA-256 and 600,000 rounds, from the browser's Web Crypto API.
- **Encryption:** AES-256-GCM, from the browser's Web Crypto API.
- **Offline use:** the whole app folder is copied onto a USB drive. Opening `index.html` from the drive runs the app with no internet and no server. The offline "install" feature needs HTTPS or `localhost` and does not apply to the USB case.

## Order of work

Each phase depends only on phases before it. Smaller items come first.

### Phase 1: Quick wins

1. **Sort by app name or login name.** A sort control in the list. The choice is remembered in the browser.
2. **Show the next code.** Display the code for the next 30-second window, greyed out, so it can be typed in when the current code is about to expire.

*Why first:* small, low risk, and uses the code generator that already works.

### Phase 2: Our own data model and editing

3. **Define one internal account model.** Name, login name, issuer, secret, algorithm, digits and period. Every import, export and screen uses this model.
4. **Edit account details.** Change app names, login names (such as email addresses) and other fields. Edits stay in the page until saved.

*Why second:* the file format and the editing screen both depend on the model.

### Phase 3: Our own encryption

5. **Encrypt and decrypt with our own format.** The locked file is JSON with a small header. The header holds the format version, the PBKDF2 settings (SHA-256, 600,000 rounds), a random salt, and the AES-256-GCM initialisation vector. The accounts are sealed inside.
6. **Open and save locked files.** Open a file from disk or a USB drive, enter the password, and see the accounts. Save writes the locked file back.
7. **Read plain files.** Open plain Bitwarden or own-format JSON and CSV files, and convert them into the locked format on save.

*Why third:* this is the core of the "physical key" idea, and everything after it depends on it.

*Note:* Web Crypto only works over HTTPS, on `localhost`, or from a `file://` page. It does not work on a plain `http://` LAN address, so the USB use case relies on `file://`.

### Phase 4: Export and the USB workflow

8. **Export locked files by default.** Files are named `<name>.YYYY-MM-DD.HH-MM-SS.<extension>`.
9. **Optional plain export.** Available only after a clear warning that the file contains live secrets.
10. **Test the USB workflow.** Copy the app folder onto a USB drive, open `index.html` from it in Chrome and Firefox, and check that open, edit and save all work with no internet.

*Why fourth:* exports depend on the file format and the editing screen.

### Phase 5: Create entries by typing

11. **Add an account by typing it in.** A simple form for secret, app name and login name.

*Why fifth:* the form is needed before QR scanning, which only fills it in.

### Phase 6: Bitwarden Authenticator compatibility

12. **Import and export Bitwarden Authenticator files.** A converter between the Bitwarden format and our internal model, for both encrypted and plain files. Check the exact Bitwarden format before writing any code.

*Why sixth:* this is now a converter, not the core. It is the riskiest item because it depends on another app's format, which can change.

### Phase 7: Create entries by scanning a QR code

13. **Add an account by scanning a QR code.** Uses the camera and a bundled QR decoder. Needs HTTPS or `localhost`.

*Why last:* it adds the most UI and the largest library. It only fills in the form from phase 5.

### Later

- **Recovery key:** a printed second key that can open a locked file if the password is forgotten.

## Principles

- **Stay small.** Static files, no server, no build step.
- **Secrets stay in memory.** Never cache, log, store or send them, apart from the explicit save and export steps.
- **Saved files are always locked by default.** Plain files are an opt-in with a warning.
- **Finish one phase before starting the next.** Each phase should work and be tested first.
