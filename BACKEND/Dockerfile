FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY src/ ./src/
# Directorio de documentos (storage interno) con permisos para el usuario sin privilegios
RUN mkdir -p uploads/contracts && chown -R node:node uploads
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/salud >/dev/null || exit 1
CMD ["node", "src/app.js"]
