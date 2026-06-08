#!/bin/bash
# Script de deploy para a VPS
# Uso: bash deploy.sh [--install] [--run]

set -e

echo "=========================================="
echo "   Agente Editorial - Deploy na VPS"
echo "=========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js não encontrado. Instale Node.js 20+ primeiro.${NC}"
    echo "Recomendado:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ necessário. Versão atual: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
echo -e "${GREEN}✓ npm $(npm -v)${NC}"
echo ""

# Instalar dependências
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependências...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependências instaladas${NC}"
elif [ "$1" == "--install" ]; then
    echo -e "${YELLOW}Reinstalando dependências...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependências atualizadas${NC}"
fi

# Copiar .env se não existir
if [ ! -f ".env" ]; then
    if [ -f ".env.vps" ]; then
        echo -e "${YELLOW}Criando .env a partir do .env.vps...${NC}"
        cp .env.vps .env
        echo -e "${GREEN}✓ .env criado (edite se necessário)${NC}"
    else
        echo -e "${RED}Arquivo .env não encontrado!${NC}"
        echo "Copie .env.example para .env e configure: cp .env.example .env"
        exit 1
    fi
fi

# Compilar TypeScript
echo -e "${YELLOW}Compilando TypeScript...${NC}"
npx tsc
echo -e "${GREEN}✓ Build completo${NC}"

# Executar modo agendado ou teste
if [ "$1" == "--run" ]; then
    echo -e "${YELLOW}Executando pipeline (teste)...${NC}"
    npx tsx src/index.ts --now
    echo ""
    echo -e "${GREEN}✅ Teste concluído! Verifique os logs acima.${NC}"
elif [ "$1" == "--install" ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "   Instalação concluída!"
    echo "==========================================${NC}"
    echo ""
    echo "Para executar:"
    echo "  npm run run:now    # Teste único"
    echo "  npm start          # Modo agendado"
    echo "  pm2 start dist/index.js --name agente-editorial  # Usando PM2"
    echo ""
    echo "Ou use systemd para serviço permanente:"
    echo '  sudo tee /etc/systemd/system/agente-editorial.service << EOF'
    echo '  [Unit]'
    echo '  Description=Agente Editorial - Blog IA'
    echo '  After=network.target'
    echo '  [Service]'
    echo '  Type=simple'
    echo "  User=$(whoami)"
    echo "  WorkingDirectory=$(pwd)"
    echo '  ExecStart=/usr/bin/npm start'
    echo '  Restart=always'
    echo '  [Install]'
    echo '  WantedBy=multi-user.target'
    echo '  EOF'
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable agente-editorial"
    echo "  sudo systemctl start agente-editorial"
else
    echo ""
    echo -e "${GREEN}=========================================="
    echo "   Deploy concluído!"
    echo "==========================================${NC}"
    echo ""
    echo -e "${YELLOW}Configure o .env com suas credenciais e execute:${NC}"
    echo "  bash deploy.sh --run            # Teste"
    echo "  npm start                        # Agendado (foreground)"
    echo "  pm2 start dist/index.js --name agente-editorial   # Produção"
    echo ""
fi
