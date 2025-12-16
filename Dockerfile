FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Szybka diagnostyka sieci/DNS/SSL w logu Portainera
RUN set -eux; \
    node -v; npm -v; \
    echo "== DNS =="; getent hosts registry.npmjs.org || true; \
    echo "== HTTPS =="; curl -I https://registry.npmjs.org/ || true; \
    echo "== NPM PING =="; npm ping --registry=https://registry.npmjs.org/ || true

COPY package.json ./
COPY package-lock.json* ./

# Pełny verbose + wymuszenie registry + dużo retry.
# Najważniejsze: jeśli padnie, Portainer pokaże dokładny komunikat npm.
RUN set -eux; \
    npm config set registry https://registry.npmjs.org/; \
    npm config set audit false; \
    npm config set fund false; \
    npm config set fetch-retries 5; \
    npm config set fetch-retry-mintimeout 20000; \
    npm config set fetch-retry-maxtimeout 120000; \
    npm install --legacy-peer-deps --no-audit --no-fund --loglevel verbose

COPY . .
RUN npm run build

FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf && \
    printf '%s\n' \
'server {' \
'  listen 80;' \
'  server_name _;' \
'  root /usr/share/nginx/html;' \
'  index index.html;' \
'  location / { try_files $uri $uri/ /index.html; }' \
'}' \
> /etc/nginx/conf.d/app.conf

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
