FROM nginx:alpine

# Consume default build arguments injected by OpenShip so Docker builds without warnings
ARG ASTRO_TELEMETRY_DISABLED
ARG CI
ARG DEBIAN_FRONTEND
ARG DO_NOT_TRACK
ARG FORCE_COLOR
ARG GATSBY_TELEMETRY_DISABLED
ARG GIT_TERMINAL_PROMPT
ARG NEXT_TELEMETRY_DISABLED
ARG NG_CLI_ANALYTICS
ARG NODE_ENV
ARG NPM_CONFIG_AUDIT
ARG NPM_CONFIG_FUND
ARG NPM_CONFIG_UPDATE_NOTIFIER
ARG NUXT_TELEMETRY_DISABLED
ARG OPENSHIP_COMMIT_SHA
ARG PNPM_NO_UPDATE_NOTIFIER
ARG TERM
ARG TZ
ARG YARN_ENABLE_TELEMETRY

COPY index.html style.css theme.js app-config.js parser.js totp.js app.js sw.js config.json icon.svg manifest.webmanifest /usr/share/nginx/html/
COPY vendor/ /usr/share/nginx/html/vendor/
COPY fonts/ /usr/share/nginx/html/fonts/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Runs at container start: builds manifest.webmanifest from config.json
COPY docker/40-generate-manifest.sh /docker-entrypoint.d/40-generate-manifest.sh
RUN chmod +x /docker-entrypoint.d/40-generate-manifest.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1
