# Etapa 1: construcción
FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL=http://localhost:4450
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Etapa 2: producción (nginx sin privilegios, cabeceras de seguridad)
FROM nginxinc/nginx-unprivileged:alpine
ENV API_ORIGIN=http://localhost:4450
COPY --from=builder /app/dist /usr/share/nginx/html
COPY templates/default.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
