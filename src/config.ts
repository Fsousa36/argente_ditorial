import { config as dotenvConfig } from 'dotenv';
import { AgentConfig, NewsSource } from './types.js';

dotenvConfig();

function parseRssFeeds(): string[] {
  const feeds = process.env.RSS_FEEDS || '';
  return feeds.split(',').map(f => f.trim()).filter(f => f.length > 0);
}

function getDefaultFeeds(): NewsSource[] {
  return [
    {
      name: 'OpenAI Blog',
      rssUrl: 'https://openai.com/index/feed.xml',
      siteUrl: 'https://openai.com/blog',
      category: 'openai',
      reliability: 10,
      language: 'en',
    },
    {
      name: 'Anthropic Blog',
      rssUrl: 'https://www.anthropic.com/index/feed.xml',
      siteUrl: 'https://www.anthropic.com/blog',
      category: 'claude',
      reliability: 10,
      language: 'en',
    },
    {
      name: 'Google AI Blog',
      rssUrl: 'https://blog.research.google/atom.xml',
      siteUrl: 'https://blog.research.google',
      category: 'gemini',
      reliability: 10,
      language: 'en',
    },
    {
      name: 'TechCrunch AI',
      rssUrl: 'https://techcrunch.com/category/artificial-intelligence/feed/',
      siteUrl: 'https://techcrunch.com/category/artificial-intelligence/',
      category: 'artificial-intelligence',
      reliability: 8,
      language: 'en',
    },
    {
      name: 'The Verge AI',
      rssUrl: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
      siteUrl: 'https://www.theverge.com/ai-artificial-intelligence',
      category: 'artificial-intelligence',
      reliability: 8,
      language: 'en',
    },
    {
      name: 'VentureBeat AI',
      rssUrl: 'https://venturebeat.com/category/ai/feed/',
      siteUrl: 'https://venturebeat.com/category/ai/',
      category: 'artificial-intelligence',
      reliability: 8,
      language: 'en',
    },
    {
      name: 'ArsTechnica AI',
      rssUrl: 'https://feeds.arstechnica.com/arstechnica/index',
      siteUrl: 'https://arstechnica.com/ai/',
      category: 'artificial-intelligence',
      reliability: 9,
      language: 'en',
    },
    {
      name: 'Hacker News',
      rssUrl: 'https://hnrss.org/frontpage',
      siteUrl: 'https://news.ycombinator.com',
      category: 'tech-general',
      reliability: 7,
      language: 'en',
    },
    {
      name: 'MIT Tech Review AI',
      rssUrl: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/',
      siteUrl: 'https://www.technologyreview.com/topic/artificial-intelligence',
      category: 'artificial-intelligence',
      reliability: 9,
      language: 'en',
    },
    {
      name: 'Wired AI',
      rssUrl: 'https://www.wired.com/feed/tag/ai/latest/rss',
      siteUrl: 'https://www.wired.com/tag/artificial-intelligence/',
      category: 'artificial-intelligence',
      reliability: 8,
      language: 'en',
    },
    {
      name: 'NVIDIA Blog AI',
      rssUrl: 'https://blogs.nvidia.com/feed/',
      siteUrl: 'https://blogs.nvidia.com/blog/category/ai/',
      category: 'artificial-intelligence',
      reliability: 8,
      language: 'en',
    },
    {
      name: 'Meta AI Blog',
      rssUrl: 'https://ai.meta.com/blog/feed.xml',
      siteUrl: 'https://ai.meta.com/blog/',
      category: 'artificial-intelligence',
      reliability: 8,
      language: 'en',
    },
    {
      name: 'DeepLearning.ai The Batch',
      rssUrl: 'https://www.deeplearning.ai/the-blog/feed.xml',
      siteUrl: 'https://www.deeplearning.ai/the-blog/',
      category: 'artificial-intelligence',
      reliability: 9,
      language: 'en',
    },
    {
      name: 'Analytics Vidhya',
      rssUrl: 'https://www.analyticsvidhya.com/blog/feed/',
      siteUrl: 'https://www.analyticsvidhya.com/blog/',
      category: 'artificial-intelligence',
      reliability: 7,
      language: 'en',
    },
    {
      name: 'MarkTechPost AI',
      rssUrl: 'https://www.marktechpost.com/feed/',
      siteUrl: 'https://www.marktechpost.com',
      category: 'artificial-intelligence',
      reliability: 6,
      language: 'en',
    },
    {
      name: 'NoCode Journal',
      rssUrl: 'https://www.nocodejournal.com/feed.xml',
      siteUrl: 'https://www.nocodejournal.com',
      category: 'no-code',
      reliability: 7,
      language: 'en',
    },
    {
      name: 'Bubble NoCode',
      rssUrl: 'https://bubble.io/blog/feed.xml',
      siteUrl: 'https://bubble.io/blog',
      category: 'no-code',
      reliability: 7,
      language: 'en',
    },
    {
      name: 'GitHub Blog AI',
      rssUrl: 'https://github.blog/category/ai/feed/',
      siteUrl: 'https://github.blog/category/ai/',
      category: 'programming',
      reliability: 9,
      language: 'en',
    },
    {
      name: 'Stack Overflow Blog',
      rssUrl: 'https://stackoverflow.blog/feed/',
      siteUrl: 'https://stackoverflow.blog',
      category: 'programming',
      reliability: 8,
      language: 'en',
    },
    {
      name: 'Hugging Face Blog',
      rssUrl: 'https://huggingface.co/blog/feed.xml',
      siteUrl: 'https://huggingface.co/blog',
      category: 'artificial-intelligence',
      reliability: 9,
      language: 'en',
    },
    {
      name: 'LangChain Blog',
      rssUrl: 'https://blog.langchain.dev/feed.xml',
      siteUrl: 'https://blog.langchain.dev',
      category: 'llm',
      reliability: 9,
      language: 'en',
    },
    {
      name: 'Simon Willison',
      rssUrl: 'https://simonwillison.net/atom/everything/',
      siteUrl: 'https://simonwillison.net',
      category: 'programming',
      reliability: 9,
      language: 'en',
    },
    {
      name: 'InfoQ AI/ML',
      rssUrl: 'https://feed.infoq.com/ai-ml-data-eng/',
      siteUrl: 'https://www.infoq.com/ai-ml-data-eng/',
      category: 'artificial-intelligence',
      reliability: 8,
      language: 'en',
    },
  ];
}

export function loadConfig(): AgentConfig {
  const rssFeeds = parseRssFeeds();
  const customFeeds = getDefaultFeeds();

  return {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    blogType: (process.env.BLOG_TYPE as 'wordpress' | 'json') || 'json',
    blogUrl: process.env.BLOG_URL || 'http://localhost:3000',
    blogApiKey: process.env.BLOG_API_KEY || '',
    outputDir: process.env.OUTPUT_DIR || './published',
    cronSchedule: process.env.CRON_SCHEDULE || '0 */6 * * *',
    maxArticlesPerRun: parseInt(process.env.MAX_ARTICLES_PER_RUN || '3', 10),
    language: (process.env.LANGUAGE as 'pt-BR' | 'en-US' | 'both') || 'pt-BR',
    audienceMode: (process.env.AUDIENCE_MODE as 'technical' | 'beginner' | 'mixed') || 'mixed',
    includeImages: process.env.INCLUDE_IMAGES !== 'false',
    rssFeeds,
    customFeeds,
  };
}
