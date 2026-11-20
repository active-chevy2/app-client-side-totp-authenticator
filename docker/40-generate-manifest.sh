#!/bin/sh
# Runs when the nginx container starts. The nginx:alpine image runs every
# /docker-entrypoint.d/*.sh file before nginx starts.
# It builds manifest.webmanifest from config.json, so the installed app gets
# the same name, description and icon as the page.

set -eu

HTML_DIR="${HTML_DIR:-/usr/share/nginx/html}"
CONFIG="$HTML_DIR/config.json"
OUT="$HTML_DIR/manifest.webmanifest"

if [ ! -f "$CONFIG" ]; then
    echo "40-generate-manifest: $CONFIG not found, keeping the default manifest"
    exit 0
fi

read_key() {
    awk -v k="$1" '
    {
        pat = "\"" k "\""
        idx = index($0, pat)
        if (idx > 0) {
            rest = substr($0, idx + length(pat))
            sub(/^[[:space:]]*:[[:space:]]*"/, "", rest)
            out = ""
            esc = 0
            for (i = 1; i <= length(rest); i++) {
                c = substr(rest, i, 1)
                if (esc) {
                    out = out "\\" c
                    esc = 0
                } else if (c == "\\") {
                    esc = 1
                } else if (c == "\"") {
                    print out
                    exit
                } else {
                    out = out c
                }
            }
        }
    }' "$CONFIG" | head -n 1
}

TITLE="$(read_key title)"
DESCRIPTION="$(read_key description)"
SHORT_NAME="$(read_key short_name)"
ICON_URL="$(read_key icon_url)"
ICON_SIZE="$(read_key icon_size)"

TITLE="${TITLE:-Offline TOTP Viewer}"
SHORT_NAME="${SHORT_NAME:-$TITLE}"
ICON_SIZE="${ICON_SIZE:-256x256}"

ICON_TYPE="image/png"
case "$ICON_URL" in
    *.svg|*.SVG) ICON_TYPE="image/svg+xml" ;;
    *.webp|*.WEBP) ICON_TYPE="image/webp" ;;
    *.jpg|*.JPG|*.jpeg|*.JPEG) ICON_TYPE="image/jpeg" ;;
esac

{
    printf '{\n'
    printf '  "name": "%s",\n' "$TITLE"
    printf '  "short_name": "%s",\n' "$SHORT_NAME"
    printf '  "description": "%s",\n' "$DESCRIPTION"
    printf '  "start_url": "./",\n'
    printf '  "scope": "./",\n'
    printf '  "display": "standalone",\n'
    printf '  "background_color": "#FFFBFE",\n'
    printf '  "theme_color": "#FFFBFE",\n'
    if [ -n "$ICON_URL" ]; then
        printf '  "icons": [\n'
        printf '    {\n'
        printf '      "src": "%s",\n' "$ICON_URL"
        printf '      "sizes": "%s",\n' "$ICON_SIZE"
        printf '      "type": "%s",\n' "$ICON_TYPE"
        printf '      "purpose": "any"\n'
        printf '    }\n'
        printf '  ]\n'
    else
        printf '  "icons": []\n'
    fi
    printf '}\n'
} > "$OUT"

echo "40-generate-manifest: wrote $OUT"
