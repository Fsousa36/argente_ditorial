import OpenAI from 'openai';
import { RawArticle, ProcessedArticle } from '../types.js';
import { createScopedLogger } from '../utils/logger.js';
import { loadConfig } from '../config.js';

const log = createScopedLogger('DeepSeekRewriter');

interface RewriterOptions {
  language: 'pt-BR' | 'en-US' | 'both';
  audienceMode: 'technical' | 'beginner' | 'mixed';
}

function generateTags(article: RawArticle, categories: string[]): string[] {
  const tags = new Set<string>();

  for (const cat of article.categories) {
    tags.add(cat.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
  }
  for (const cat of categories) {
    tags.add(cat.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
  }

  const lowerTitle = article.title.toLowerCase();
  const lowerDesc = article.description.toLowerCase();
  const allText = lowerTitle + ' ' + lowerDesc;

  if (allText.includes('openai') || allText.includes('gpt') || allText.includes('chatgpt') || allText.includes('o1') || allText.includes('o3') || allText.includes('sora')) tags.add('openai');
  if (allText.includes('anthropic') || allText.includes('claude')) { tags.add('anthropic'); tags.add('claude-code'); }
  if (allText.includes('google') || allText.includes('gemini')) { tags.add('google'); tags.add('gemini'); }
  if (allText.includes('meta') || allText.includes('llama')) { tags.add('meta'); tags.add('llama'); }
  if (allText.includes('deepseek')) tags.add('deepseek');
  if (allText.includes('no-code') || allText.includes('nocode') || allText.includes('low-code')) tags.add('no-code');
  if (allText.includes('vibe') || allText.includes('prompt engineering') || allText.includes('cursor') || allText.includes('copilot')) tags.add('vibe-coding');
  if (allText.includes('llm') || allText.includes('large language model')) tags.add('llm');
  if (allText.includes('ai') || allText.includes('artificial intelligence') || allText.includes('machine learning')) { tags.add('inteligencia-artificial'); tags.add('machine-learning'); }

  return Array.from(tags).slice(0, 10);
}

function estimateReadTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export async function rewriteArticle(
  article: RawArticle,
  options?: Partial<RewriterOptions>
): Promise<ProcessedArticle | null> {
  const config = loadConfig();
  const language = options?.language || config.language;
  const audienceMode = options?.audienceMode || config.audienceMode;

  const apiKey = config.openaiApiKey; // Pode ser DeepSeek key também

  if (!apiKey) {
    log.error('API Key não configurada');
    return null;
  }

  // DeepSeek é compatível com a API da OpenAI
  const deepseek = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.deepseek.com/v1',
  });

  const audiencePrompt = audienceMode === 'technical'
    ? 'assuma o leitor tem conhecimento técnico avançado em programação e IA'
    : audienceMode === 'beginner'
    ? 'assuma que o leitor é iniciante, explique conceitos de forma simples'
    : 'equilibre profundidade técnica com acessibilidade para um público misto';

  const languagePrompt = language === 'pt-BR'
    ? 'Escreva o artigo COMPLETAMENTE em português brasileiro, como se fosse um blog brasileiro de tecnologia.'
    : language === 'en-US'
    ? 'Write the article in English (US).'
    : 'Write the article primarily in Portuguese (BR), but keep technical terms in English when appropriate.';

  log.info(`Rewriting article: "${article.title.substring(0, 60)}..."`);

  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Você é um editor-chefe de um blog de tecnologia especializado em Inteligência Artificial, No-Code, LLMs, Vibe Coding e ferramentas como OpenAI, Claude, Gemini, DeepSeek.

SUA FUNÇÃO:
- Reescreva artigos baseados em notícias reais de fontes confiáveis
- NUNCA invente factos ou informações - use APENAS o conteúdo fornecido
- Mantenha a precisão técnica e o contexto original
- Adicione análise e contexto relevante quando pertinente
- Seja crítico: questione hype e destaque limitações quando apropriado

${audiencePrompt}

${languagePrompt}

ESTRUTURA DO ARTIGO:
1. TÍTULO: Crie um título atraente, informativo e otimizado para SEO (máx. 70 caracteres)
2. SUBTÍTULO: Um subtítulo curto que expande o título (1-2 frases)
3. INTRODUÇÃO: Contexto sobre por que isso é importante agora (2-3 parágrafos)
4. DESENVOLVIMENTO: Os fatos, detalhes técnicos, citações relevantes (3-5 parágrafos)
5. ANÁLISE: Sua perspectiva editorial - o que isso significa para o ecossistema (1-2 parágrafos)
6. CONCLUSÃO: Resumo e o que esperar a seguir (1 parágrafo)

FORMATO DE RESPOSTA (JSON):
{
  "title": "string - título em PT-BR",
  "subtitle": "string - subtítulo",
  "introduction": "string - markdown",
  "body": "string - markdown com seções",
  "analysis": "string - markdown",
  "conclusion": "string - markdown",
  "summary": "string - resumo de 2-3 frases para meta description",
  "tags": ["string"],
  "seoKeywords": ["string"]
}`,
        },
        {
          role: 'user',
          content: `Reescreva o seguinte artigo como conteúdo original para o blog. Use APENAS os fatos fornecidos abaixo. Não invente nada.

Título original: ${article.title}
Fonte: ${article.sourceName}
Data: ${article.publishedAt.toISOString()}
Autor(es): ${article.authors.join(', ') || 'Desconhecido'}
URL original: ${article.url}

DESCRIÇÃO:
${article.description}

CONTEÚDO:
${article.content}

CATEGORIAS:
${article.categories.join(', ')}

Lembretes:
- NÃO plagie - reescreva com suas próprias palavras
- NÃO invente citações, dados ou fatos que não estão no texto original
- Mantenha a integridade factual
- Adicione valor editorial: contexto, análise, implicações`,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      log.error('Empty response from DeepSeek');
      return null;
    }

    const parsed = JSON.parse(content);
    const fullContent = `${parsed.introduction}\n\n${parsed.body}\n\n${parsed.analysis ? `## Análise\n\n${parsed.analysis}\n\n` : ''}${parsed.conclusion ? `## Conclusão\n\n${parsed.conclusion}` : ''}`;

    const tags = parsed.tags && Array.isArray(parsed.tags)
      ? parsed.tags
      : generateTags(article, article.categories);

    const seoKeywords = parsed.seoKeywords && Array.isArray(parsed.seoKeywords)
      ? parsed.seoKeywords
      : tags;

    const processed: ProcessedArticle = {
      ...article,
      rewrittenTitle: parsed.title,
      rewrittenContent: fullContent,
      summary: parsed.summary || article.description.substring(0, 300),
      tags,
      seoKeywords,
      estimatedReadTime: estimateReadTime(fullContent),
      imageCredit: null,
      imageCaption: null,
    };

    log.info(`Successfully rewrote: "${processed.rewrittenTitle}"`);
    return processed;
  } catch (error) {
    log.error('Failed to rewrite article with DeepSeek', { error: String(error) });
    return null;
  }
}

export async function rewriteArticles(
  articles: RawArticle[],
  options?: Partial<RewriterOptions>
): Promise<ProcessedArticle[]> {
  const config = loadConfig();
  const maxArticles = Math.min(articles.length, config.maxArticlesPerRun);
  const articlesToProcess = articles.slice(0, maxArticles);

  log.info(`Rewriting ${articlesToProcess.length} articles (max: ${maxArticles})`);

  const results: ProcessedArticle[] = [];

  for (let i = 0; i < articlesToProcess.length; i++) {
    const article = articlesToProcess[i];
    log.info(`[${i + 1}/${articlesToProcess.length}] Processing: ${article.title.substring(0, 50)}`);

    const processed = await rewriteArticle(article, options);
    if (processed) {
      results.push(processed);
    }

    if (i < articlesToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  log.info(`Successfully rewrote ${results.length}/${articlesToProcess.length} articles`);
  return results;
}
