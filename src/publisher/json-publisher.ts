import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ProcessedArticle, PublishedArticle } from '../types.js';
import { createScopedLogger } from '../utils/logger.js';
import { loadConfig } from '../config.js';

const log = createScopedLogger('JSONPublisher');

interface BlogIndex {
  lastUpdated: string;
  totalArticles: number;
  articles: Array<{
    slug: string;
    title: string;
    summary: string;
    tags: string[];
    publishedAt: string;
    imageUrl: string | null;
    estimatedReadTime: number;
    originalUrl: string;
    sourceName: string;
  }>;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function generateHtmlArticle(article: ProcessedArticle): string {
  const imgTag = article.imageUrl
    ? `<figure class="featured-image">
  <img src="${article.imageUrl}" alt="${article.imageCaption || article.rewrittenTitle}" style="width:100%;max-width:900px;border-radius:12px;margin:20px 0;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        ${article.imageCaption ? `<figcaption style="font-size:0.85rem;color:#666;margin-top:8px;">${article.imageCaption} — ${article.imageCredit || ''}</figcaption>` : ''}
       </figure>`
    : '';

  const tagsHtml = article.tags
    .map(tag => `<span class="tag" style="display:inline-block;background:#e8f0fe;color:#1a73e8;padding:4px 12px;border-radius:16px;font-size:0.85rem;margin:4px;">#${tag}</span>`)
    .join(' ');

  const metaHtml = `
    <div class="article-meta" style="color:#666;font-size:0.9rem;margin:12px 0;">
      <span>📅 ${new Date(article.publishedAt).toLocaleDateString('pt-BR')}</span>
      <span style="margin-left:16px;">📖 ${article.estimatedReadTime} min de leitura</span>
      <span style="margin-left:16px;">🏷️ ${tagsHtml}</span>
    </div>`;

  const sourceLink = article.sourceUrl
    ? `<p style="font-size:0.85rem;color:#999;margin-top:32px;padding-top:16px;border-top:1px solid #eee;">
        <em>Fonte: <a href="${article.url}" target="_blank" rel="noopener noreferrer" style="color:#1a73e8;">${article.sourceName}</a></em>
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.rewrittenTitle}</title>
  <meta name="description" content="${article.summary}">
  <meta name="keywords" content="${article.seoKeywords.join(', ')}">
  <meta property="og:title" content="${article.rewrittenTitle}">
  <meta property="og:description" content="${article.summary}">
  <meta property="og:image" content="${article.imageUrl || ''}">
  <meta property="og:type" content="article">
  <meta property="article:published_time" content="${article.publishedAt.toISOString()}">
  <meta property="article:tag" content="${article.tags.join(', ')}">
  <link rel="canonical" href="${article.url}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a2e; background: #f8f9fa; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 2rem; line-height: 1.3; margin-bottom: 8px; color: #1a1a2e; }
    h2 { font-size: 1.4rem; margin-top: 32px; margin-bottom: 12px; color: #16213e; }
    h3 { font-size: 1.15rem; margin-top: 24px; margin-bottom: 8px; color: #0f3460; }
    p { margin-bottom: 16px; color: #333; }
    blockquote { border-left: 4px solid #1a73e8; margin: 20px 0; padding: 12px 20px; background: #e8f0fe; border-radius: 0 8px 8px 0; font-style: italic; }
    ul, ol { margin: 12px 0 16px 24px; }
    li { margin-bottom: 6px; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #1a1a2e; color: #e0e0e0; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 0.9rem; }
    .article-footer { margin-top: 48px; padding-top: 24px; border-top: 2px solid #e0e0e0; font-size: 0.9rem; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <article>
      <header>
        <h1>${article.rewrittenTitle}</h1>
        ${metaHtml}
      </header>

      ${imgTag}

      <div class="content">
        ${article.rewrittenContent
          .split('\n')
          .map(line => {
            if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
            if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
            if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
            if (line.startsWith('> ')) return `<blockquote>${line.slice(2)}</blockquote>`;
            if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
            if (line.match(/^\d+\. /)) return `<li>${line.replace(/^\d+\. /, '')}</li>`;
            if (line.trim() === '') return '<br>';
            return `<p>${line}</p>`;
          })
          .join('\n')
        }
      </div>

      ${sourceLink}

      <footer class="article-footer">
        <p><strong>Tags:</strong> ${tagsHtml}</p>
        <p><strong>Artigo original:</strong> <a href="${article.url}" target="_blank" rel="noopener noreferrer">${article.sourceName}</a></p>
        ${article.imageCredit ? `<p><strong>Crédito da imagem:</strong> ${article.imageCredit}</p>` : ''}
      </footer>
    </article>
  </div>
</body>
</html>`;
}

function generateJsonExport(article: ProcessedArticle): object {
  return {
    title: article.rewrittenTitle,
    slug: slugify(article.rewrittenTitle),
    summary: article.summary,
    content: article.rewrittenContent,
    tags: article.tags,
    seoKeywords: article.seoKeywords,
    publishedAt: article.publishedAt.toISOString(),
    estimatedReadTime: article.estimatedReadTime,
    imageUrl: article.imageUrl,
    imageCredit: article.imageCredit,
    imageCaption: article.imageCaption,
    originalUrl: article.url,
    sourceName: article.sourceName,
    authors: article.authors,
    language: article.language,
  };
}

function updateBlogIndex(outputDir: string, article: ProcessedArticle): void {
  const indexPath = join(outputDir, 'index.json');
  let index: BlogIndex = { lastUpdated: '', totalArticles: 0, articles: [] };

  if (existsSync(indexPath)) {
    try {
      index = JSON.parse(readFileSync(indexPath, 'utf-8'));
    } catch {
      log.warn('Could not parse existing index.json, creating new one');
    }
  }

  const slug = slugify(article.rewrittenTitle);

  // Remove duplicate if exists
  index.articles = index.articles.filter(a => a.slug !== slug);

  index.articles.unshift({
    slug,
    title: article.rewrittenTitle,
    summary: article.summary,
    tags: article.tags,
    publishedAt: new Date().toISOString(),
    imageUrl: article.imageUrl,
    estimatedReadTime: article.estimatedReadTime,
    originalUrl: article.url,
    sourceName: article.sourceName,
  });

  index.lastUpdated = new Date().toISOString();
  index.totalArticles = index.articles.length;

  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  log.info(`Blog index updated: ${index.totalArticles} articles`);
}

export async function publishArticleToJson(article: ProcessedArticle): Promise<PublishedArticle> {
  const config = loadConfig();
  const outputDir = config.outputDir;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const slug = slugify(article.rewrittenTitle);

  try {
    // Generate HTML file
    const htmlContent = generateHtmlArticle(article);
    const htmlPath = join(outputDir, `${slug}.html`);
    writeFileSync(htmlPath, htmlContent, 'utf-8');
    log.info(`HTML published: ${htmlPath}`);

    // Generate JSON data file
    const jsonData = generateJsonExport(article);
    const jsonPath = join(outputDir, `${slug}.json`);
    writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    log.info(`JSON published: ${jsonPath}`);

    // Generate Markdown file (for manual editing / import)
    const mdContent = `---
title: "${article.rewrittenTitle}"
date: "${new Date().toISOString()}"
tags: [${article.tags.map(t => `"${t}"`).join(', ')}]
summary: "${article.summary}"
image: "${article.imageUrl || ''}"
originalSource: "${article.sourceName}"
originalUrl: "${article.url}"
readTime: ${article.estimatedReadTime}
---

${article.rewrittenContent}
`;
    const mdPath = join(outputDir, `${slug}.md`);
    writeFileSync(mdPath, mdContent, 'utf-8');
    log.info(`Markdown published: ${mdPath}`);

    // Update blog index
    updateBlogIndex(outputDir, article);

    const blogUrl = `${config.blogUrl}/posts/${slug}`;

    return {
      originalUrl: article.url,
      title: article.rewrittenTitle,
      slug,
      publishedAt: new Date().toISOString(),
      blogUrl,
      status: 'published',
    };
  } catch (error) {
    log.error('Failed to publish article', { error: String(error), article: article.rewrittenTitle });
    return {
      originalUrl: article.url,
      title: article.rewrittenTitle,
      slug,
      publishedAt: new Date().toISOString(),
      blogUrl: '',
      status: 'error',
      error: String(error),
    };
  }
}

export async function publishArticlesToJson(
  articles: ProcessedArticle[]
): Promise<PublishedArticle[]> {
  log.info(`Publishing ${articles.length} articles to JSON...`);

  const results: PublishedArticle[] = [];
  for (const article of articles) {
    const result = await publishArticleToJson(article);
    results.push(result);
  }

  const published = results.filter(r => r.status === 'published').length;
  const errors = results.filter(r => r.status === 'error').length;
  log.info(`Published: ${published}, Errors: ${errors}`);

  return results;
}
