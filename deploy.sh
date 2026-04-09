#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Docker Build para Sistema de Reservas de Mesas${NC}"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado. Instale primeiro: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

# Verificar arquivo .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Criando a partir do .env.example${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Edite o arquivo .env com suas credenciais do Back4App${NC}"
    exit 1
fi

# Build da imagem
echo -e "${GREEN}📦 Construindo imagem Docker...${NC}"
docker build -t sistema-reservas-mesas:latest .

# Verificar se build foi bem sucedido
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
    
    # Parar container antigo se existir
    echo -e "${YELLOW}🔄 Parando container antigo...${NC}"
    docker stop sistema-reservas-mesas 2>/dev/null
    docker rm sistema-reservas-mesas 2>/dev/null
    
    # Rodar novo container
    echo -e "${GREEN}🚀 Iniciando container...${NC}"
    docker run -d \
        --name sistema-reservas-mesas \
        --restart unless-stopped \
        -p 3000:3000 \
        --env-file .env \
        sistema-reservas-mesas:latest
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Container iniciado com sucesso!${NC}"
        echo -e "${GREEN}🌐 API disponível em: http://localhost:3000${NC}"
        echo -e "${YELLOW}📋 Logs: docker logs -f sistema-reservas-mesas${NC}"
    else
        echo -e "${RED}❌ Erro ao iniciar container${NC}"
    fi
else
    echo -e "${RED}❌ Erro no build da imagem${NC}"
fi