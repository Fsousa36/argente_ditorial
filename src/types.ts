// === TIPOS CENTRAIS DO SISTEMA ===

export interface NewsSource {
  name: string;
  rssUrl: string;
  siteUrl: string;
  category: NewsCategory;
  reliability: number; // 1-10
  language: 'en' | 'pt' | 'other';
}

export type NewsCategory =
  | 'artificial-intelligence'
  | 'llm'
  | 'no-code'
  | 'vibe-coding'
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'programming'
  | 'tech-general'
  | 'startups';

export interface RawArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: Date;
  authors: string[];
  categories: string[];
  imageUrl: string | null;
  language: string;
}

export interface ProcessedArticle extends RawArticle {
  rewrittenTitle: string;
  rewrittenContent: string;
  summary: string;
  tags: string[];
  seoKeywords: string[];
  estimatedReadTime: number;
  imageCredit: string | null;
  imageCaption: string | null;
}

export interface PublishedArticle {
  originalUrl: string;
  title: string;
  slug: string;
  publishedAt: string;
  blogUrl: string;
  status: 'published' | 'draft' | 'error';
  error?: string;
}

export interface AgentConfig {
  openaiApiKey: string;
  blogType: 'wordpress' | 'json';
  blogUrl: string;
  blogApiKey: string;
  outputDir: string;
  cronSchedule: string;
  maxArticlesPerRun: number;
  language: 'pt-BR' | 'en-US' | 'both';
  audienceMode: 'technical' | 'beginner' | 'mixed';
  includeImages: boolean;
  rssFeeds: string[];
  customFeeds: NewsSource[];
}

export interface ArticleDeduplicationRecord {
  originalUrl: string;
  title: string;
  processedAt: string;
  publishedAt: string | null;
  hash: string;
}

export interface ImageResult {
  url: string;
  alt: string;
  caption: string;
  credit: string;
  source: string;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface Logger {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
}
