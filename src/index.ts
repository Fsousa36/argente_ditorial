import { CronJob } from 'cron';
import { loadConfig } from './config.js';
import { fetchAllSources } from './sources/rss-fetcher.js';
import { rewriteArticles } from './rewriter/deepseek-rewriter.js';
import { addImagesToArticles } from './images/image-fetcher.js';
import { publishArticlesToJson } from './publisher/json-publisher.js';
import { Deduplicator } from './utils/deduplicator.js';
import { createScopedLogger } from './utils/logger.js';
import { RawArticle } from './types.js';

const log = createScopedLogger('Main');

const config = loadConfig();
const deduplicator = new Deduplicator({
  storagePath: config.outputDir,
});

interface RunResult {
  totalFetched: number;
  newArticles: number;
  rewritten: number;
  published: number;
  errors: number;
  duration: number;
}

async function runPipeline(): Promise<RunResult> {
  const startTime = Date.now();
  log.info('=== INICIANDO PIPELINE DE PUBLICAÇÃO ===');
  log.info(`Config: maxArticles=${config.maxArticlesPerRun}, language=${config.language}, audience=${config.audienceMode}`);

  let totalFetched = 0;
  let newArticles = 0;
  let rewritten = 0;
  let published = 0;
  let errors = 0;

  try {
    // Step 1: Fetch articles from all RSS sources
    log.info('Step 1/4: Buscando artigos das fontes RSS...');
    const allArticles: RawArticle[] = await fetchAllSources();
    totalFetched = allArticles.length;
    log.info(`Fetched ${totalFetched} articles total`);

    // Step 2: Deduplicate
    log.info('Step 2/4: Deduplicando artigos...');
    const uniqueArticles: RawArticle[] = [];
    for (const article of allArticles) {
      if (!deduplicator.isDuplicate(article.url, article.title, article.content)) {
        uniqueArticles.push(article);
        newArticles++;
      }
    }
    log.info(`New unique articles: ${newArticles} (${totalFetched - newArticles} duplicates skipped)`);

    if (uniqueArticles.length === 0) {
      log.info('Nenhum artigo novo encontrado. Pipeline concluído.');
      const stats = deduplicator.getStats();
      log.info('Estatísticas de deduplicação:', { total: stats.total, published: stats.published, pending: stats.pending });
      return { totalFetched, newArticles: 0, rewritten: 0, published: 0, errors: 0, duration: Date.now() - startTime };
    }

    // Step 3: Rewrite articles using OpenAI
    log.info('Step 3/4: Reescrevendo artigos com IA...');
    const processedArticles = await rewriteArticles(uniqueArticles);

    if (processedArticles.length === 0) {
      log.warn('Nenhum artigo foi reescrito com sucesso.');
      return { totalFetched, newArticles, rewritten: 0, published: 0, errors, duration: Date.now() - startTime };
    }

    rewritten = processedArticles.length;

    // Step 4: Add images
    if (config.includeImages) {
      log.info('Step 3b/4: Adicionando imagens aos artigos...');
      const withImages = await addImagesToArticles(processedArticles);

      // Step 5: Publish
      log.info('Step 4/4: Publicando artigos...');
      const results = await publishArticlesToJson(withImages);

      for (const result of results) {
        if (result.status === 'published') {
          published++;
          // Mark as processed in deduplicator
          deduplicator.markAsProcessed(result.originalUrl, result.title, '', true, result.publishedAt);
          log.info(`✅ Publicado: "${result.title}" → ${result.blogUrl}`);
        } else {
          errors++;
          // Still mark as processed to avoid re-processing failed articles
          deduplicator.markAsProcessed(result.originalUrl, result.title, '', false);
          log.error(`❌ Falha ao publicar: "${result.title}" - ${result.error}`);
        }
      }
    } else {
      // Publish without images
      const results = await publishArticlesToJson(processedArticles);
      for (const result of results) {
        if (result.status === 'published') {
          published++;
          deduplicator.markAsProcessed(result.originalUrl, result.title, '', true, result.publishedAt);
          log.info(`✅ Publicado: "${result.title}" → ${result.blogUrl}`);
        } else {
          errors++;
          deduplicator.markAsProcessed(result.originalUrl, result.title, '', false);
          log.error(`❌ Falha ao publicar: "${result.title}" - ${result.error}`);
        }
      }
    }

    // Show recent stats
    const stats = deduplicator.getStats();
    log.info('Estatísticas de deduplicação:', { total: stats.total, published: stats.published, pending: stats.pending });

    const recentArticles = deduplicator.getRecentProcessed(3);
    log.info('Artigos processados recentemente:');
    for (const article of recentArticles) {
      log.info(`  - ${article.title} (${article.publishedAt ? '✅ publicado' : '⏳ pendente'})`);
    }
  } catch (error) {
    log.error('Erro fatal no pipeline', { error: String(error) });
    errors++;
  }

  const duration = Date.now() - startTime;
  log.info(`=== PIPELINE CONCLUÍDO em ${Math.round(duration / 1000)}s ===`);
  log.info(`Resultados: ${totalFetched} buscados, ${newArticles} novos, ${rewritten} reescritos, ${published} publicados, ${errors} erros`);

  return { totalFetched, newArticles, rewritten, published, errors, duration };
}

// Start the scheduled job
function startScheduler(): void {
  log.info('Inicializando agendador...');
  log.info(`Agendamento configurado: ${config.cronSchedule} (atualmente: ${config.cronSchedule})`);

  const job = new CronJob(
    config.cronSchedule,
    async () => {
      log.info('=== EXECUÇÃO AGENDADA INICIADA ===');
      try {
        await runPipeline();
      } catch (error) {
        log.error('Erro na execução agendada', { error: String(error) });
      }
      log.info('=== EXECUÇÃO AGENDADA CONCLUÍDA ===');
    },
    null,
    true,
    'America/Sao_Paulo'
  );

    log.info(`Agendador iniciado. Próxima execução: ${job.nextDate().toISO()}`);

    // Log next 3 execution times
    const nextDates = job.nextDates(3);
    for (let i = 0; i < nextDates.length; i++) {
      log.info(`  Execução ${i + 1}: ${nextDates[i].toISO()}`);
    }
}

// Main entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const runOnce = args.includes('--once') || args.includes('--now');

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║      🤖 AGENTE EDITORIAL v1.0           ║');
  console.log('║  Blog automatizado sobre IA, No-Code,   ║');
  console.log('║  LLMs, Vibe Coding & mais                ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // Validate config
  if (!config.openaiApiKey) {
    log.warn('⚠ OPENAI_API_KEY não configurada. Defina no arquivo .env');
    log.warn('  O sistema precisa da chave da OpenAI para reescrever os artigos.');
    log.warn('  Copie .env.example para .env e adicione sua chave.');
  }

  log.info(`Modo: ${runOnce ? 'Execução única' : 'Agendado'}`);
  log.info(`Tipo de blog: ${config.blogType}`);
  log.info(`Diretório de saída: ${config.outputDir}`);
  log.info(`Idioma: ${config.language}`);
  log.info(`Público-alvo: ${config.audienceMode}`);
  log.info(`Máx. artigos por execução: ${config.maxArticlesPerRun}`);
  log.info(`Fontes RSS configuradas: ${config.customFeeds.length}`);

  if (runOnce) {
    log.info('▶ Executando pipeline uma vez...');
    const result = await runPipeline();
  log.info('Resultado final:', result as unknown as Record<string, unknown>);
    process.exit(0);
  } else {
    startScheduler();
    log.info('Agendador rodando. Pressione Ctrl+C para parar.');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log.info('Recebido SIGINT. Encerrando graciosamente...');
  deduplicator.save();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.info('Recebido SIGTERM. Encerrando graciosamente...');
  deduplicator.save();
  process.exit(0);
});

// Unhandled error handling
process.on('uncaughtException', (error) => {
  log.error('Exceção não capturada', { error: String(error) });
  deduplicator.save();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('Promise rejeitada não tratada', { error: String(reason) });
});

main().catch((error) => {
  log.error('Fatal error', { error: String(error) });
  process.exit(1);
});
