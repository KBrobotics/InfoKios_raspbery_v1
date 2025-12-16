# ====== BUILD (stabilniej niż alpine w Portainerze) ======
FROM node:20-bookworm-slim AS build
WORKDIR /app

# certy + opcjonalnie git (czasem paczki mają zależności z git url)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git \
 && rm -rf /var/lib/apt/lists/*

# zależności
COPY package.json ./
COPY package-lock.json* ./

# npm install (fallback na częste problemy z peer deps)
RUN npm install --no-audit --no-fund --legacy-peer-deps

# kod + build
COPY . .
RUN npm run build


# ====== RUNTIME ======
FROM nginx:alpine

# Twoja konfiguracja nginx z repo
COPY nginx.conf /etc/nginx/conf.d/default.conf

# statyczne pliki z Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
