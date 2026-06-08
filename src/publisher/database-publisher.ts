import pkg from 'pg';
const { Pool } = pkg;
import { createScopedLogger } from '../utils/logger.js';
import { ProcessedArticle, PublishedArticle } from '../types.js';
import { loadConfig } from '../config.js';

const log = createScopedLogger('DBPublisher');

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string[];
  image_url: string | null;
  image_credit: string | null;
  published_at: string;
  source_name: string;
  source_url: string;
  read_time: number;
  status: 'published' | 'draft';
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function detectTableSchema(pool: any): Promise<string[]> {
  return pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `).then((res: any) => res.rows.map((r: any) => r.table_name));
}

function buildPostgresPublisher(pool: any) {
  return {
    name: 'postgres',
    async publish(article: ProcessedArticle): Promise<PublishedArticle> {
      const slug = slugify(article.rewrittenTitle);
      const now = new Date().toISOString();

      // Detect if 'posts' or 'blog_posts' table exists
      const tables = await detectTableSchema(pool);

      let tableName = 'posts';
      if (tables.includes('blog_posts')) tableName = 'blog_posts';
      if (tables.includes('artigos')) tableName = 'artigos';

      // Detect columns
      const columnsRes = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);

      const columns = columnsRes.rows.map((r: any) => r.column_name);
      log.info(`Table "${tableName}" columns: ${columns.join(', ')}`);

      const hasTags = columns.includes('tags');
      const hasSlug = columns.includes('slug');
      const hasExcerpt = columns.includes('excerpt');
      const hasImageUrl = columns.includes('image_url') || columns.includes('featured_image');
      const hasReadTime = columns.includes('read_time') || columns.includes('reading_time');
      const hasSourceName = columns.includes('source_name') || columns.includes('original_source');
      const hasSourceUrl = columns.includes('source_url') || columns.includes('original_url');
      const hasStatus = columns.includes('status') || columns.includes('published');
      const hasCreatedAt = columns.includes('created_at');
      const hasUpdatedAt = columns.includes('updated_at');

      // Build column mappings
      const colMap: Record<string, string | number | boolean | null> = {};
      if (hasSlug) colMap['slug'] = slug;
      colMap['title'] = article.rewrittenTitle;
      colMap['content'] = article.rewrittenContent;
      if (hasExcerpt) colMap['excerpt'] = article.summary;
      if (hasTags) colMap['tags'] = JSON.stringify(article.tags);
      if (hasImageUrl) {
        const imgCol = columns.includes('image_url') ? 'image_url' : 'featured_image';
        colMap[imgCol] = article.imageUrl;
      }
      if (hasReadTime) {
        const rtCol = columns.includes('read_time') ? 'read_time' : 'reading_time';
        colMap[rtCol] = article.estimatedReadTime;
      }
      if (hasSourceName) {
        const snCol = columns.includes('source_name') ? 'source_name' : 'original_source';
        colMap[snCol] = article.sourceName;
      }
      if (hasSourceUrl) {
        const suCol = columns.includes('source_url') ? 'source_url' : 'original_url';
        colMap[suCol] = article.url;
      }
      if (hasStatus) {
        const stCol = columns.includes('status') ? 'status' : 'published';
        colMap[stCol] = 'published';
      }
      if (hasCreatedAt) colMap['created_at'] = now;
      if (hasUpdatedAt) colMap['updated_at'] = now;

      // Insert
      const insertCols = Object.keys(colMap).join(', ');
      const insertVals = Object.keys(colMap).map((_, i) => `$${i + 1}`).join(', ');
      const values = Object.values(colMap);

      try {
        await pool.query(
          `INSERT INTO "${tableName}" (${insertCols}) VALUES (${insertVals}) ON CONFLICT (slug) DO NOTHING`,
          values
        );
        log.info(`✅ Post published to PostgreSQL: "${article.rewrittenTitle}" (table: ${tableName})`);

        return {
          originalUrl: article.url,
          title: article.rewrittenTitle,
          slug,
          publishedAt: now,
          blogUrl: `https://levelingdev.com.br/blog/${slug}`,
          status: 'published',
        };
      } catch (err: any) {
        // Try without ON CONFLICT if slug column doesn't exist
        if (err.message?.includes('ON CONFLICT')) {
          await pool.query(
            `INSERT INTO "${tableName}" (${insertCols}) VALUES (${insertVals})`,
            values
          );
          return {
            originalUrl: article.url,
            title: article.rewrittenTitle,
            slug,
            publishedAt: now,
            blogUrl: `https://levelingdev.com.br/blog/${slug}`,
            status: 'published',
          };
        }
        throw err;
      }
    },
  };
}

export async function publishToDatabase(article: ProcessedArticle): Promise<PublishedArticle> {
  const config = loadConfig();
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://levelingdevblog:%40Fsousa518581@levelingdev-blog-umkmld:5432/levelingdev-db';

  if (!databaseUrl) {
    log.warn('DATABASE_URL not configured, skipping database publish');
    return { ...article, slug: slugify(article.rewrittenTitle), publishedAt: new Date().toISOString(), blogUrl: '', status: 'error', error: 'DATABASE_URL not configured' } as any;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const publisher = buildPostgresPublisher(pool);
    const result = await publisher.publish(article);
    return result;
  } catch (error) {
    log.error('Failed to publish to database', { error: String(error) });
    return {
      originalUrl: article.url,
      title: article.rewrittenTitle,
      slug: slugify(article.rewrittenTitle),
      publishedAt: new Date().toISOString(),
      blogUrl: '',
      status: 'error',
      error: String(error),
    };
  } finally {
    await pool.end();
  }
}

export async function publishArticlesToDatabase(
  articles: ProcessedArticle[]
): Promise<PublishedArticle[]> {
  log.info(`Publishing ${articles.length} articles to PostgreSQL database...`);

  const results: PublishedArticle[] = [];
  for (const article of articles) {
    const result = await publishToDatabase(article);
    results.push(result);
  }

  const published = results.filter(r => r.status === 'published').length;
  const errors = results.filter(r => r.status === 'error').length;
  log.info(`Database publish: ${published} published, ${errors} errors`);

  return results;
}
