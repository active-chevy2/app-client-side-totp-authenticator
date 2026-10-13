FROM nginx:alpine

COPY index.html style.css theme.js parser.js totp.js app.js /usr/share/nginx/html/
COPY vendor/ /usr/share/nginx/html/vendor/
COPY fonts/ /usr/share/nginx/html/fonts/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
