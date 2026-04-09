FROM node:18-alpine

WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Usar npm install em vez de npm ci (não exige package-lock.json)
RUN npm install --only=production

# Copiar código fonte
COPY src/ ./src/

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health',(r)=>{r.statusCode===200?process.exit(0):process.exit(1)})"

# Comando para rodar
CMD ["node", "src/index.js"]