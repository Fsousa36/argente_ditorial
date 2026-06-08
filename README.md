# 🤖 Agente Editorial — Blog Automatizado sobre IA, No-Code, LLMs & Vibe Coding

Sistema inteligente que busca notícias reais de fontes confiáveis sobre **Inteligência Artificial, No-Code, LLMs, Vibe Coding, OpenAI, Claude, Gemini** e tecnologias relacionadas, reescreve os artigos **sem plagiar e sem inventar fatos**, e publica automaticamente no seu blog.

## 🎯 Funcionalidades

- **Busca multicontes** — RSS de 20+ fontes confiáveis (OpenAI, Anthropic, Google AI, TechCrunch, The Verge, VentureBeat, MIT Tech Review, Hugging Face, LangChain, GitHub, Stack Overflow, e mais)
- **Deduplicação inteligente** — Evita republicar o mesmo artigo por similaridade de título, URL e hash de conteúdo
- **Reescrita com IA (OpenAI GPT-4o)** — Reescreve em **português brasileiro**, mantendo contexto, dados técnicos precisos e integridade factual
- **Imagens reais** — Busca imagens no Unsplash/Pexels ou usa imagens temáticas por nicho
- **Publicação em múltiplos formatos** — HTML, Markdown, JSON + índice do blog
- **Agendamento automático** — Cron configurável (padrão: a cada 6 horas)
- **Sem plágio** — Cada artigo é reescrito do zero com análise editorial original
- **Sem alucinações** — O sistema é instruído a usar APENAS os fatos fornecidos

## 📋 Pré-requisitos

- **Node.js** 18+ (recomendado 20+)
- **Chave da API OpenAI** (GPT-4o) — obrigatória para reescrita
- **Chaves Unsplash/Pexels** (opcional — para imagens reais)

## 🚀 Instalação

```bash
# Clone o repositório
git clone <seu-repositorio>
cd agente-editorial

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com sua chave da OpenAI
```

## ⚙️ Configuração

Edite o arquivo `.env`:

```env
# OBRIGATÓRIO
OPENAI_API_KEY=sk-sua-chave-openai

# Opcional — para imagens reais
UNSPLASH_ACCESS_KEY=sua-chave-unsplash
PEXELS_API_KEY=sua-chave-pexels

# Configurações do blog
BLOG_TYPE=json
OUTPUT_DIR=./published
LANGUAGE=pt-BR
AUDIENCE_MODE=mixed    # technical | beginner | mixed
MAX_ARTICLES_PER_RUN=3

# Agendamento (a cada 6 horas)
CRON_SCHEDULE=0 */6 * * *
```

## 🏃 Uso

```bash
# Execução única (teste)
npm run run:now

# Execução única
npm run run:once

# Modo agendado (rodando em background)
npm start

# Desenvolvimento com hot-reload
npm run dev
```

## 📁 Estrutura de Arquivos Gerados

Após a execução, os artigos publicados ficam em `./published/`:

```
published/
├── index.json              # Índice do blog (lista de todos os artigos)
├── como-a-openai-lancou-o-gpt-5.html    # HTML formatado
├── como-a-openai-lancou-o-gpt-5.json    # Dados estruturados
├── como-a-openai-lancou-o-gpt-5.md      # Markdown para importação
├── anthropic-revela-claude-4-opus.html
├── deduplication.json      # Registro de deduplicação
└── ...
```

## 🌐 Integração com WordPress

Para publicar diretamente no WordPress (via REST API):

1. Configure no `.env`:
   ```env
   BLOG_TYPE=wordpress
   BLOG_URL=https://seudominio.com
   BLOG_API_KEY=seu-jwt-token-ou-application-password
   ```

2. O sistema enviará os artigos via REST API do WordPress automaticamente.

## 📡 Fontes de Notícias

O sistema busca de **20+ fontes** por padrão, incluindo:

| Fonte | Categoria | Confiabilidade |
|-------|-----------|:---:|
| OpenAI Blog | OpenAI | ⭐⭐⭐⭐⭐ |
| Anthropic Blog | Claude | ⭐⭐⭐⭐⭐ |
| Google AI Blog | Gemini | ⭐⭐⭐⭐⭐ |
| TechCrunch AI | IA Geral | ⭐⭐⭐⭐ |
| The Verge AI | IA Geral | ⭐⭐⭐⭐ |
| VentureBeat AI | IA Geral | ⭐⭐⭐⭐ |
| ArsTechnica | IA Geral | ⭐⭐⭐⭐⭐ |
| MIT Tech Review | IA Geral | ⭐⭐⭐⭐⭐ |
| Hugging Face Blog | IA/ML | ⭐⭐⭐⭐⭐ |
| LangChain Blog | LLMs | ⭐⭐⭐⭐⭐ |
| GitHub Blog AI | Programação | ⭐⭐⭐⭐⭐ |
| Stack Overflow Blog | Programação | ⭐⭐⭐⭐ |
| Simon Willison Blog | Programação/LLMs | ⭐⭐⭐⭐⭐ |
| InfoQ AI/ML | IA/ML | ⭐⭐⭐⭐ |
| NVIDIA AI Blog | IA | ⭐⭐⭐⭐ |
| Meta AI Blog | IA | ⭐⭐⭐⭐ |
| DeepLearning.ai | IA/ML | ⭐⭐⭐⭐⭐ |
| Bubble NoCode | No-Code | ⭐⭐⭐⭐ |
| Wired AI | IA Geral | ⭐⭐⭐⭐ |

> Você pode adicionar/remover fontes editando o array `getDefaultFeeds()` em `src/config.ts`.

## 🧠 Como Funciona

```
[Fontes RSS] → [Busca] → [Deduplicação] → [Reescrita com GPT-4o] → [Imagens] → [Publicação]
     ↓             ↓            ↓                   ↓                    ↓            ↓
  20+ sites   Artigos     Remove          GPT-4o reescreve     Unsplash/    HTML + JSON
  confiáveis  crus        duplicados      em PT-BR com         Pexels ou   + Markdown
                                          análise editorial    temáticas   + Índice
```

### Pipeline Completo:
1. **Fetch** — Busca artigos de 20+ fontes RSS simultaneamente
2. **Dedup** — Remove duplicatas por URL, hash de conteúdo e similaridade de título
3. **Rewrite** — Cada artigo é enviado ao GPT-4o que:
   - Reescreve mantendo fatos precisos
   - NUNCA inventa dados
   - Adiciona análise editorial e contexto
   - Gera título SEO, tags, meta description
4. **Images** — Busca imagem real relacionada ao tema
5. **Publish** — Salva em HTML, JSON, Markdown + atualiza índice

## 🛡️ Segurança e Ética

- **Sem plágio** — Cada artigo é uma reescrita original com análise
- **Sem alucinações** — Sistema explicitamente instruído a não inventar fatos
- **Atribuição** — Links para fonte original sempre incluídos
- **Transparência** — Metadados com fonte, data, autor preservados

## 📊 Monitoramento

O sistema loga tudo no console com níveis de severidade:

```
[2026-06-08T06:00:00.000Z] [INFO] [Main] === INICIANDO PIPELINE ===
[2026-06-08T06:00:01.000Z] [INFO] [RSSFetcher] Fetching from 20 RSS sources...
[2026-06-08T06:00:05.000Z] [INFO] [RSSFetcher] Total articles fetched: 47
[2026-06-08T06:00:05.000Z] [INFO] [Deduplicator] New unique articles: 3
[2026-06-08T06:00:08.000Z] [INFO] [OpenAIRewriter] Rewriting article: "OpenAI lança..."
[2026-06-08T06:00:15.000Z] [INFO] [OpenAIRewriter] Successfully rewrote: "OpenAI Lança Novo Modelo..."
[2026-06-08T06:00:20.000Z] [INFO] [JSONPublisher] ✅ Publicado: "OpenAI Lança..." → blog/posts/...
```

## 🐳 Docker (opcional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

## 📝 Licença

MIT

---

**Feito por YOUNES** · [Discord](https://discord.gg/Xdncu7wf6z)
