FROM nginx:1.27-alpine

ARG VERSION=dev
ARG BUILD_TIME=unbekannt

COPY index.html /usr/share/nginx/html/index.html
RUN sed -i "s|__VERSION__|${VERSION}|g; s|__BUILD_TIME__|${BUILD_TIME}|g" /usr/share/nginx/html/index.html \
 && printf '{"status":"ok","version":"%s","build":"%s"}\n' "$VERSION" "$BUILD_TIME" > /usr/share/nginx/html/health.json

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/health.json || exit 1
