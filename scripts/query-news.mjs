#!/usr/bin/env node
/**
 * Query AI news — works globally via remote API or local/cache data.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(__dirname, '..');
const CACHE_DATA_DIR = join(SKILL_DIR, 'cache', 'data');
const REMOTE_URL =
  'https://suyxh.github.io/ai-news-aggregator/data/latest-24h.json';
const REMOTE_URL_7D =
  'https://suyxh.github.io/ai-news-aggregator/data/latest-7d.json';
const STALE_HOURS = 3;

function parseArgs(argv) {
  const opts = {
    window: '24h',
    keyword: '',
    site: '',
    source: '',
    limit: 20,
    format: 'markdown',
    remote: false,
    local: false,
    dataDir: '',
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--remote') opts.remote = true;
    else if (arg === '--local') opts.local = true;
    else if (arg === '--window' && argv[i + 1]) opts.window = argv[++i];
    else if (arg === '--keyword' && argv[i + 1]) opts.keyword = argv[++i];
    else if (arg === '--site' && argv[i + 1]) opts.site = argv[++i];
    else if (arg === '--source' && argv[i + 1]) opts.source = argv[++i];
    else if (arg === '--limit' && argv[i + 1]) opts.limit = parseInt(argv[++i], 10);
    else if (arg === '--format' && argv[i + 1]) opts.format = argv[++i];
    else if (arg === '--data-dir' && argv[i + 1]) opts.dataDir = resolve(argv[++i]);
  }

  return opts;
}

function printHelp() {
  console.log(`AI News Query Tool (global)

Usage: node query-news.mjs [options]

Data source priority (default):
  1. --data-dir (if set)
  2. AI_NEWS_DATA_DIR env
  3. ai-news-aggregator project in cwd
  4. skill cache (cache/data under skill dir)
  5. remote GitHub Pages API (auto fallback)

Options:
  --window <24h|7d>     Time window (default: 24h)
  --keyword <text>      Filter by keyword in title/source
  --site <site_id>      Filter by platform (aihot, techurls, opmlrss, ...)
  --source <text>       Filter by source substring
  --limit <n>           Max results (default: 20)
  --format <fmt>        Output: json | markdown | summary (default: markdown)
  --remote              Force remote API
  --local               Force local/cache only (no remote fallback)
  --data-dir <path>     Custom data directory
  --help, -h            Show this help
`);
}

function isProjectRoot(dir) {
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.name === 'ai-news-aggregator';
  } catch {
    return false;
  }
}

function findLocalDataDir() {
  if (process.env.AI_NEWS_DATA_DIR) {
    return resolve(process.env.AI_NEWS_DATA_DIR);
  }

  if (process.env.AI_NEWS_AGGREGATOR_ROOT && isProjectRoot(process.env.AI_NEWS_AGGREGATOR_ROOT)) {
    return join(process.env.AI_NEWS_AGGREGATOR_ROOT, 'data');
  }

  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (isProjectRoot(dir)) return join(dir, 'data');
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  if (existsSync(join(CACHE_DATA_DIR, 'latest-24h.json'))) {
    return CACHE_DATA_DIR;
  }

  return null;
}

function isStale(generatedAt) {
  return Date.now() - new Date(generatedAt).getTime() > STALE_HOURS * 60 * 60 * 1000;
}

async function fetchRemote(window) {
  const url = window === '7d' ? REMOTE_URL_7D : REMOTE_URL;
  process.stderr.write(`📡 Fetching from ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return { payload: await res.json(), source: url };
}

async function loadPayload(opts) {
  const filename = opts.window === '7d' ? 'latest-7d.json' : 'latest-24h.json';

  if (opts.remote) {
    return fetchRemote(opts.window);
  }

  const dataDir = opts.dataDir || findLocalDataDir();
  if (dataDir) {
    const localPath = join(dataDir, filename);
    if (existsSync(localPath)) {
      const payload = JSON.parse(readFileSync(localPath, 'utf-8'));
      if (!isStale(payload.generated_at)) {
        return { payload, source: localPath };
      }
      process.stderr.write(`⚠ Local data stale (>${STALE_HOURS}h): ${localPath}\n`);
      if (opts.local) {
        return { payload, source: localPath };
      }
      process.stderr.write('  Falling back to remote API...\n');
    } else if (opts.local) {
      throw new Error(`Local file not found: ${localPath}`);
    }
  } else if (opts.local) {
    throw new Error('No local data found. Run fetch-news.sh or unset --local.');
  }

  return fetchRemote(opts.window);
}

function displayTitle(item) {
  return item.title_zh || item.title || item.title_en || '(无标题)';
}

function filterItems(items, opts) {
  let result = items;

  if (opts.site) {
    const site = opts.site.toLowerCase();
    result = result.filter((i) => i.site_id?.toLowerCase() === site);
  }

  if (opts.source) {
    const src = opts.source.toLowerCase();
    result = result.filter((i) => (i.source || '').toLowerCase().includes(src));
  }

  if (opts.keyword) {
    const kw = opts.keyword.toLowerCase();
    result = result.filter((i) => {
      const text = [i.title, i.title_zh, i.title_en, i.title_bilingual, i.source, i.site_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(kw);
    });
  }

  return result.slice(0, opts.limit);
}

function formatTime(iso) {
  if (!iso) return '未知时间';
  try {
    return new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  } catch {
    return iso;
  }
}

function outputJson(items, payload, source) {
  console.log(
    JSON.stringify(
      {
        meta: {
          generated_at: payload.generated_at,
          window_hours: payload.window_hours,
          total_items: payload.total_items,
          matched: items.length,
          source,
        },
        items,
      },
      null,
      2
    )
  );
}

function outputSummary(items, payload) {
  const date = new Date(payload.generated_at).toLocaleDateString('zh-CN');
  console.log(`# AI 资讯摘要 · ${date}`);
  console.log(`> ${payload.total_items} 条 AI 相关资讯 | 匹配 ${items.length} 条\n`);

  const bySite = new Map();
  for (const item of items) {
    const key = item.site_name || item.site_id;
    bySite.set(key, (bySite.get(key) || 0) + 1);
  }

  console.log('## 来源分布');
  for (const [name, count] of [...bySite.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${name}: ${count}`);
  }

  console.log('\n## Top 条目');
  items.slice(0, 10).forEach((item, i) => {
    console.log(
      `${i + 1}. ${displayTitle(item)} — ${item.source} (${formatTime(item.published_at)})`
    );
  });
}

function outputMarkdown(items, payload, source) {
  const date = new Date(payload.generated_at).toLocaleDateString('zh-CN');
  console.log(`# AI 资讯简报 · ${date}\n`);
  console.log(
    `> 数据：${payload.window_hours}h 窗口，共 ${payload.total_items} 条 | 展示 ${items.length} 条`
  );
  console.log(`> 来源：${source}\n`);

  items.forEach((item, i) => {
    const title = displayTitle(item);
    console.log(`## ${i + 1}. [${title}](${item.url})\n`);
    console.log(`- **平台**：${item.site_name} (${item.site_id})`);
    console.log(`- **来源**：${item.source}`);
    console.log(`- **时间**：${formatTime(item.published_at)}`);
    if (item.title_bilingual && item.title_bilingual !== title) {
      console.log(`- **双语**：${item.title_bilingual}`);
    }
    console.log('');
  });
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    return;
  }

  const { payload, source } = await loadPayload(opts);
  const items = filterItems(payload.items || [], opts);

  if (items.length === 0) {
    process.stderr.write('⚠ No matching items found.\n');
    process.exit(1);
  }

  switch (opts.format) {
    case 'json':
      outputJson(items, payload, source);
      break;
    case 'summary':
      outputSummary(items, payload);
      break;
    default:
      outputMarkdown(items, payload, source);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
