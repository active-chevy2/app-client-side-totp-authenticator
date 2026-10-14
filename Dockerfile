FROM nginx:alpine

COPY index.html style.css theme.js app-config.js parser.js totp.js app.js sw.js config.json manifest.webmanifest /usr/share/nginx/html/
COPY vendor/ /usr/share/nginx/html/vendor/
COPY fonts/ /usr/share/nginx/html/fonts/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Runs at container start: builds manifest.webmanifest from config.json
COPY docker/40-generate-manifest.sh /docker-entrypoint.d/40-generate-manifest.sh
RUN chmod +x /docker-entrypoint.d/40-generate-manifest.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
