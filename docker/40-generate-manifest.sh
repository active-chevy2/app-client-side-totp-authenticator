#!/bin/sh
# Runs when the nginx container starts. The nginx:alpine image runs every
# /docker-entrypoint.d/*.sh file before nginx starts.
# It builds manifest.webmanifest from config.json, so the installed app gets
# the same name, description and icon as the page.
# Values in config.json must be plain text: no double quotes or backslashes.

set -eu

HTML_DIR="${HTML_DIR:-/usr/share/nginx/html}"
CONFIG="$HTML_DIR/config.json"
OUT="$HTML_DIR/manifest.webmanifest"

if [ ! -f "$CONFIG" ]; then
    echo "40-generate-manifest: $CONFIG not found, keeping the default manifest"
    exit 0
fi

read_key() {
    sed -n 's/.*"'"$1"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$CONFIG" | head -n 1
}

TITLE="$(read_key title)"
DESCRIPTION="$(read_key description)"
SHORT_NAME="$(read_key short_name)"
ICON_URL="$(read_key icon_url)"
ICON_SIZE="$(read_key icon_size)"

TITLE="${TITLE:-2FA Authenticator}"
SHORT_NAME="${SHORT_NAME:-$TITLE}"
ICON_SIZE="${ICON_SIZE:-128x128}"

ICONS=""
if [ -n "$ICON_URL" ]; then
    ICONS='{ "src": "'"$ICON_URL"'", "sizes": "'"$ICON_SIZE"'", "type": "image/png", "purpose": "any" }'
fi

cat > "$OUT" << EOF
{
  "name": "$TITLE",
  "short_name": "$SHORT_NAME",
  "description": "$DESCRIPTION",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#FFFBFE",
  "theme_color": "#6750A4",
  "icons": [ $ICONS ]
}
EOF

echo "40-generate-manifest: wrote $OUT"
