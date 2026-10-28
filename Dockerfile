FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
RUN apk add --no-cache nodejs ffmpeg
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod -R a+rX /usr/share/nginx/html
COPY server.mjs controls.mjs admin-auth.mjs local-upstream-session.mjs profile-key.mjs atomic-state.mjs /app/
COPY entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh \
    && chmod -R a+rX /app /etc/nginx \
    && mkdir -p /data /var/cache/nginx /run \
    && chown -R 1000:1000 /data /var/cache/nginx /run
ENV YATTEE_WEB_DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8080
USER 1000:1000
ENTRYPOINT ["/entrypoint.sh"]
