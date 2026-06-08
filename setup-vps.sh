#!/bin/bash
# ==========================================
#  SETUP AUTOMÁTICO DO AGENTE EDITORIAL NA VPS
#  Execute como root na VPS:
#    ssh root@76.13.96.60
#    bash <(curl -s https://raw.githubusercontent.com/Fsousa36/argente_ditorial/master/setup-vps.sh)
# ==========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "=========================================="
echo "   🚀 AGENTE EDITORIAL - SETUP VPS      "
echo "   Blog: levelingdev.com.br              "
echo "   VPS: 76.13.96.60                      "
echo "=========================================="
echo -e "${NC}"

# -----------------------------------------------------------
# 1. Atualizar sistema
# -----------------------------------------------------------
echo -e "${YELLOW}[1/8] Atualizando sistema...${NC}"
apt update -y && apt upgrade -y

# -----------------------------------------------------------
# 2. Instalar Node.js 20 LTS
# -----------------------------------------------------------
echo -e "${YELLOW}[2/8] Instalando Node.js 20 LTS...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# -----------------------------------------------------------
# 3. Instalar Git (se não tiver)
# -----------------------------------------------------------
echo -e "${YELLOW}[3/8] Instalando Git...${NC}"
apt install -y git

# -----------------------------------------------------------
# 4. Clonar repositório
# -----------------------------------------------------------
echo -e "${YELLOW}[4/8] Clonando Agente Editorial...${NC}"
if [ -d "/root/argente_ditorial" ]; then
    echo "Diretório já existe. Atualizando..."
    cd /root/argente_ditorial
    git pull
else
    git clone https://github.com/Fsousa36/argente_ditorial.git /root/argente_ditorial
    cd /root/argente_ditorial
fi

# -----------------------------------------------------------
# 5. Configurar .env
# -----------------------------------------------------------
echo -e "${YELLOW}[5/8] Configurando .env...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# === CONFIGURAÇÕES DA API DEEPSEEK ===
OPENAI_API_KEY=sk-c5d1f64990bc498cb701dd4b4ce278dc
API_PROVIDER=deepseek

# === CONFIGURAÇÕES DO BLOG (PostgreSQL) ===
BLOG_TYPE=database
DATABASE_URL=postgresql://levelingdevblog:%40Fsousa518581@levelingdev-blog-umkmld:5432/levelingdev-db
DATABASE_SSL=false
ADMIN_TOKEN=seu_token_do_editor
BLOG_URL=https://levelingdev.com.br

# === ARQUIVOS LOCAIS (fallback) ===
OUTPUT_DIR=./published

# === AGENDAMENTO (a cada 6 horas) ===
CRON_SCHEDULE=0 */6 * * *

# === CONTEÚDO ===
MAX_ARTICLES_PER_RUN=3
LANGUAGE=pt-BR
AUDIENCE_MODE=mixed
INCLUDE_IMAGES=true

# === FONTES RSS ===
RSS_FEEDS=
EOF
    echo -e "${GREEN}✓ .env criado com chave DeepSeek + PostgreSQL${NC}"
else
    echo -e "${GREEN}✓ .env já existe${NC}"
fi

# -----------------------------------------------------------
# 6. Instalar dependências e compilar
# -----------------------------------------------------------
echo -e "${YELLOW}[6/8] Instalando dependências...${NC}"
npm install
echo -e "${GREEN}✓ Dependências instaladas${NC}"

echo -e "${YELLOW}[6/8] Compilando TypeScript...${NC}"
npx tsc
echo -e "${GREEN}✓ Build completo${NC}"

# -----------------------------------------------------------
# 7. Testar execução
# -----------------------------------------------------------
echo -e "${YELLOW}[7/8] Executando teste (buscando + reescrevendo 1 artigo)...${NC}"
npx tsx src/index.ts --now || echo -e "${RED}⚠ Teste encontrou erro (pode ser conexão DB) - mas o sistema está instalado${NC}"

# -----------------------------------------------------------
# 8. Configurar serviço systemd
# -----------------------------------------------------------
echo -e "${YELLOW}[8/8] Configurando serviço permanente...${NC}"

cat > /etc/systemd/system/agente-editorial.service << 'SERVICEEOF'
[Unit]
Description=Agente Editorial - Blog IA levelingdev.com.br
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/argente_ditorial
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=30
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable agente-editorial
systemctl start agente-editorial

# -----------------------------------------------------------
# Final
# -----------------------------------------------------------
echo ""
echo -e "${GREEN}=========================================="
echo "   ✅ SETUP COMPLETO!"
echo "==========================================${NC}"
echo ""
echo -e "${CYAN}📡 Status do serviço:${NC}"
systemctl status agente-editorial --no-pager | head -15
echo ""
echo -e "${CYAN}📋 Comandos úteis:${NC}"
echo "  Ver logs:        journalctl -u agente-editorial -f"
echo "  Reiniciar:       systemctl restart agente-editorial"
echo "  Parar:           systemctl stop agente-editorial"
echo "  Teste manual:    cd /root/argente_ditorial && npm run run:now"
echo ""
echo -e "${CYAN}📂 Artigos publicados em: /root/argente_ditorial/published/${NC}"
echo ""
