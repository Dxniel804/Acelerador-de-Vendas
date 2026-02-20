#!/bin/bash

# Cores para o terminal
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}>>> Iniciando atualização do projeto...${NC}"

# 1. Puxar as últimas alterações do GitHub
echo -e "${GREEN}>>> Baixando código do GitHub...${NC}"
git pull origin main

# 2. Reconstruir e subir os containers
echo -e "${GREEN}>>> Reconstruindo imagens e subindo containers...${NC}"
# Usamos --build para garantir que o frontend pegue as novas variáveis de ambiente
docker-compose up -d --build

# 3. Limpar imagens antigas (opcional, para economizar espaço)
echo -e "${GREEN}>>> Limpando imagens antigas...${NC}"
docker image prune -f

echo -e "${GREEN}>>> Atualização concluída com sucesso!${NC}"
