FROM node:20-alpine

WORKDIR /app

# Instalar dependências primeiro (cache layer)
COPY package*.json ./
RUN npm ci --only=production

# Copiar código compilado e fonte
COPY tsconfig.json ./
COPY src/ ./src/
COPY .env.vps ./.env

# Compilar
RUN npx tsc

# Remover source TypeScript (apenas JS em produção)
RUN rm -rf src/

# Criar diretório de publicação
RUN mkdir -p /app/published

# Saúde
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('fs').existsSync('/app/published') ? process.exit(0) : process.exit(1)"

CMD ["node", "dist/index.js"]
