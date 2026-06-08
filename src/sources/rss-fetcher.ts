import Parser from 'rss-parser';
import { RawArticle, NewsSource } from '../types.js';
import { createScopedLogger } from '../utils/logger.js';
import { loadConfig } from '../config.js';

const log = createScopedLogger('RSSFetcher');

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'AgenteEditorial/1.0 (AI News Aggregator; +https://github.com/argente-editorial)',
    'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['dc:creator', 'dcCreator'],
      ['summary', 'summary'],
    ],
  },
});

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function generateArticleId(url: string): string {
  const hash = url.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
  }, 0);
  return `raw_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

function extractImageFromItem(item: any): string | null {
  if (item.enclosure?.url) return item.enclosure.url;
  if (item.mediaContent?.url) return item.mediaContent.url;
  if (item.mediaThumbnail?.url) return item.mediaThumbnail.url;
  if (item['media:content']?.$?.url) return item['media:content'].$.url;
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgMatch) return imgMatch[1];
  }
  return null;
}

export async function fetchFromRSS(source: NewsSource): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];

  try {
    log.info(`Fetching RSS: ${source.name} (${source.rssUrl})`);
    const feed = await parser.parseURL(source.rssUrl);

    if (!feed.items || feed.items.length === 0) {
      log.warn(`No items found in feed: ${source.name}`);
      return [];
    }

    log.info(`Found ${feed.items.length} items from ${source.name}`);

    for (const item of feed.items) {
      if (!item.title || !item.link) continue;

      const content = item.content || item.contentSnippet || item.summary || '';
      const description = item.contentSnippet || item.summary || item.content || '';

      if (description.length < 50) continue; // Skip very short/no-content items

      const raw: RawArticle = {
        id: generateArticleId(item.link),
        title: stripHtml(item.title),
        description: stripHtml(description.substring(0, 500)),
        content: stripHtml(content),
        url: item.link,
        sourceName: source.name,
        sourceUrl: source.siteUrl,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        authors: item.dcCreator ? [item.dcCreator] : item.creator ? [item.creator] : [],
        categories: item.categories || [],
        imageUrl: extractImageFromItem(item),
        language: source.language,
      };

      articles.push(raw);
    }
  } catch (error) {
    log.error(`Failed to fetch RSS from ${source.name}`, { error: String(error) });
  }

  return articles;
}

export async function fetchAllSources(config?: { customFeeds?: NewsSource[] }): Promise<RawArticle[]> {
  const cfg = loadConfig();
  const allSources = config?.customFeeds || cfg.customFeeds;
  const allArticles: RawArticle[] = [];

  log.info(`Fetching from ${allSources.length} RSS sources...`);

  const concurrency = 3;
  for (let i = 0; i < allSources.length; i += concurrency) {
    const batch = allSources.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(source => fetchFromRSS(source)));

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      }
    }
  }

  // Sort by published date, newest first
  allArticles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  log.info(`Total articles fetched: ${allArticles.length}`);
  return allArticles;
}
