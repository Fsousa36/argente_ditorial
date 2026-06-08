import axios from 'axios';
import { createScopedLogger } from '../utils/logger.js';
import { ProcessedArticle, ImageResult } from '../types.js';

const log = createScopedLogger('ImageFetcher');

// Unsplash API - busca imagens reais de alta qualidade
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const UNSPLASH_API = 'https://api.unsplash.com';

// Pexels API - fallback
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const PEXELS_API = 'https://api.pexels.com/v1';

interface UnsplashResult {
  urls: { regular: string; small: string; raw: string };
  alt_description: string;
  description: string;
  user: { name: string; links: { html: string } };
  links: { html: string };
}

interface PexelsResult {
  src: { large: string; medium: string; original: string };
  alt: string;
  photographer: string;
  photographer_url: string;
  url: string;
}

function extractSearchKeywords(article: ProcessedArticle): string {
  // Create search query from article tags and title
  const keywords = [...article.tags];
  if (article.title) {
    const words = article.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5);
    keywords.push(...words);
  }

  return keywords.slice(0, 5).join(' ');
}

async function searchUnsplash(query: string): Promise<ImageResult | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    log.warn('UNSPLASH_ACCESS_KEY not configured, skipping Unsplash search');
    return null;
  }

  try {
    const response = await axios.get(`${UNSPLASH_API}/search/photos`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      params: { query, per_page: 1, orientation: 'landscape' },
    });

    const results: UnsplashResult[] = response.data.results;
    if (results.length === 0) return null;

    const img = results[0];
    return {
      url: img.urls.regular,
      alt: img.alt_description || img.description || query,
      caption: img.description || img.alt_description || '',
      credit: `Foto por ${img.user.name} no Unsplash`,
      source: img.links.html,
    };
  } catch (error) {
    log.warn('Unsplash search failed', { query, error: String(error) });
    return null;
  }
}

async function searchPexels(query: string): Promise<ImageResult | null> {
  if (!PEXELS_API_KEY) {
    log.warn('PEXELS_API_KEY not configured, skipping Pexels search');
    return null;
  }

  try {
    const response = await axios.get(`${PEXELS_API}/search`, {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: 1, orientation: 'landscape' },
    });

    const photos: PexelsResult[] = response.data.photos;
    if (!photos || photos.length === 0) return null;

    const img = photos[0];
    return {
      url: img.src.large,
      alt: img.alt || query,
      caption: '',
      credit: `Foto por ${img.photographer} no Pexels`,
      source: img.url,
    };
  } catch (error) {
    log.warn('Pexels search failed', { query, error: String(error) });
    return null;
  }
}

// Imagens temáticas padrão para quando não há API configurada
function getThematicImage(article: ProcessedArticle): ImageResult {
  const themeImages: Record<string, ImageResult> = {
    'openai': {
      url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200',
      alt: 'Inteligência Artificial e aprendizado de máquina',
      caption: 'Representação abstrata de inteligência artificial e redes neurais',
      credit: 'Unsplash',
      source: 'https://unsplash.com/photos/ai-generated-abstract-network',
    },
    'claude': {
      url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200',
      alt: 'Código e programação de IA',
      caption: 'Código de programação com elementos de inteligência artificial',
      credit: 'Unsplash',
      source: 'https://unsplash.com/photos/coding-screen',
    },
    'gemini': {
      url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200',
      alt: 'Código de computador em tela',
      caption: 'Desenvolvimento de software e programação',
      credit: 'Unsplash',
      source: 'https://unsplash.com/photos/code-on-screen',
    },
    'no-code': {
      url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200',
      alt: 'Desenvolvimento no-code e low-code',
      caption: 'Plataforma de desenvolvimento visual drag-and-drop',
      credit: 'Unsplash',
      source: 'https://unsplash.com/photos/visual-development',
    },
    'vibe-coding': {
      url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200',
      alt: 'Programação e desenvolvimento de software',
      caption: 'Desenvolvedor trabalhando em código com ferramentas modernas',
      credit: 'Unsplash',
      source: 'https://unsplash.com/photos/coding-setup',
    },
    'llm': {
      url: 'https://images.unsplash.com/photo-1675557009875-436f4c0c5a97?w=1200',
      alt: 'Modelo de linguagem e redes neurais',
      caption: 'Visualização de modelo de linguagem e processamento de texto',
      credit: 'Unsplash',
      source: 'https://unsplash.com/photos/ai-language-model',
    },
  };

  // Match by tags
  for (const tag of article.tags) {
    if (themeImages[tag]) {
      return themeImages[tag];
    }
  }

  // Default AI image
  return {
    url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200',
    alt: 'Inteligência Artificial e tecnologia',
    caption: 'Tecnologia de inteligência artificial',
    credit: 'Unsplash',
    source: 'https://unsplash.com/photos/ai-technology',
  };
}

export async function fetchImageForArticle(article: ProcessedArticle): Promise<ProcessedArticle> {
  const query = extractSearchKeywords(article);
  log.info(`Searching image for: "${article.rewrittenTitle.substring(0, 50)}" (query: "${query}")`);

  let imageResult: ImageResult | null = null;

  // Try Unsplash first
  if (UNSPLASH_ACCESS_KEY) {
    imageResult = await searchUnsplash(query);
  }

  // Fallback to Pexels
  if (!imageResult && PEXELS_API_KEY) {
    imageResult = await searchPexels(query);
  }

  // Fallback to thematic images
  if (!imageResult) {
    imageResult = getThematicImage(article);
    log.info('Using thematic fallback image');
  } else {
    log.info(`Found image: ${imageResult.url.substring(0, 50)}`);
  }

  return {
    ...article,
    imageUrl: imageResult.url,
    imageCredit: imageResult.credit,
    imageCaption: imageResult.caption,
  };
}

export async function addImagesToArticles(
  articles: ProcessedArticle[]
): Promise<ProcessedArticle[]> {
  log.info(`Adding images to ${articles.length} articles...`);

  const results: ProcessedArticle[] = [];
  for (const article of articles) {
    const withImage = await fetchImageForArticle(article);
    results.push(withImage);
  }

  log.info(`Images added to ${results.length} articles`);
  return results;
}
