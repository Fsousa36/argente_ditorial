import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { ArticleDeduplicationRecord } from '../types.js';
import { createScopedLogger } from './logger.js';

const log = createScopedLogger('Deduplicator');

const HASH_ALGORITHM = 'sha256';

interface DeduplicatorOptions {
  storagePath: string;
}

export class Deduplicator {
  private records: Map<string, ArticleDeduplicationRecord> = new Map();
  private storagePath: string;
  private loaded = false;

  constructor(options: DeduplicatorOptions) {
    this.storagePath = options.storagePath;
  }

  private get filePath(): string {
    return join(this.storagePath, 'deduplication.json');
  }

  load(): void {
    if (this.loaded) return;

    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8');
        const parsed: ArticleDeduplicationRecord[] = JSON.parse(raw);
        for (const record of parsed) {
          this.records.set(record.originalUrl, record);
        }
        log.info(`Loaded ${this.records.size} deduplication records`);
      } else {
        log.info('No existing deduplication records found, starting fresh');
      }
    } catch (error) {
      log.warn('Failed to load deduplication records, starting fresh', { error: String(error) });
    }

    this.loaded = true;
  }

  save(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const records = Array.from(this.records.values());
      writeFileSync(this.filePath, JSON.stringify(records, null, 2), 'utf-8');
      log.debug(`Saved ${records.length} deduplication records`);
    } catch (error) {
      log.error('Failed to save deduplication records', { error: String(error) });
    }
  }

  private computeHash(content: string): string {
    return createHash(HASH_ALGORITHM).update(content.toLowerCase().trim()).digest('hex');
  }

  isDuplicate(url: string, title: string, content: string): boolean {
    this.load();

    // Check by URL first
    if (this.records.has(url)) {
      log.debug(`Duplicate found by URL: ${title}`);
      return true;
    }

    // Check by content hash (semantic near-dedup)
    const contentHash = this.computeHash(content);
    for (const [, record] of this.records) {
      if (record.hash === contentHash) {
        log.debug(`Duplicate found by content hash: ${title} ≈ ${record.title}`);
        return true;
      }
    }

    // Check by normalized title similarity
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [, record] of this.records) {
      const normalizedExisting = record.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedTitle === normalizedExisting) {
        log.debug(`Duplicate found by title: ${title} ≈ ${record.title}`);
        return true;
      }
      // Check for high similarity (likely same story from different sources)
      if (this.titleSimilarity(normalizedTitle, normalizedExisting) > 0.85) {
        log.debug(`Duplicate found by title similarity: ${title} ≈ ${record.title}`);
        return true;
      }
    }

    return false;
  }

  private titleSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    // Simple bigram overlap similarity
    const bigrams = new Set<string>();
    for (let i = 0; i < longer.length - 1; i++) {
      bigrams.add(longer.substring(i, i + 2));
    }

    let matches = 0;
    for (let i = 0; i < shorter.length - 1; i++) {
      if (bigrams.has(shorter.substring(i, i + 2))) {
        matches++;
      }
    }

    return (2.0 * matches) / (longer.length + shorter.length - 2);
  }

  markAsProcessed(
    url: string,
    title: string,
    content: string,
    published: boolean,
    publishedAt?: string
  ): void {
    this.load();

    const record: ArticleDeduplicationRecord = {
      originalUrl: url,
      title,
      processedAt: new Date().toISOString(),
      publishedAt: publishedAt || null,
      hash: this.computeHash(content),
    };

    if (published) {
      record.publishedAt = publishedAt || new Date().toISOString();
    }

    this.records.set(url, record);
    this.save();
  }

  getStats(): { total: number; published: number; pending: number } {
    this.load();
    let published = 0;
    for (const [, record] of this.records) {
      if (record.publishedAt) published++;
    }
    return {
      total: this.records.size,
      published,
      pending: this.records.size - published,
    };
  }

  getRecentProcessed(count: number = 10): ArticleDeduplicationRecord[] {
    this.load();
    return Array.from(this.records.values())
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime())
      .slice(0, count);
  }
}
