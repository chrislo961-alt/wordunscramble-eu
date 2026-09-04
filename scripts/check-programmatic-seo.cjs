#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const origin = 'https://wordunscramble.eu';
const failures = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function exists(relative) {
  return fs.existsSync(path.join(root, relative));
}

function routeToFile(route) {
  return route === '/'
    ? 'index.html'
    : `${route.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
}

function grab(html, re) {
  return html.match(re)?.[1]?.trim() || '';
}

function sitemapRoutes(file) {
  if (!exists(file)) {
    failures.push(`Missing sitemap: ${file}`);
    return [];
  }
  return Array.from(read(file).matchAll(/<loc>(https:\/\/wordunscramble\.eu[^<]+)<\/loc>/g), (m) => {
    const pathname = new URL(m[1]).pathname;
    return pathname.endsWith('/') || path.extname(pathname) ? pathname : `${pathname}/`;
  });
}

if (!exists('data/programmatic-seo-routes.json')) {
  console.error('FAILURES\n- Missing data/programmatic-seo-routes.json. Run node scripts/build-programmatic-seo.cjs first.');
  process.exit(1);
}

const manifest = JSON.parse(read('data/programmatic-seo-routes.json'));
const stats = exists('data/programmatic-seo-stats.json') ? JSON.parse(read('data/programmatic-seo-stats.json')) : {};
const generatedRoutes = new Set(manifest.map((item) => item.route));
const indexable = manifest.filter((item) => item.indexable);
const noindex = manifest.filter((item) => !item.indexable);

if (manifest.length < 600) failures.push(`Generated coverage unexpectedly small: ${manifest.length}`);
if (indexable.length < 350) failures.push(`Indexable generated coverage unexpectedly small: ${indexable.length}`);
if (!noindex.length) failures.push('Quality gate produced no noindex pages; thresholds may be ineffective');
if (new Set(manifest.map((item) => item.route)).size !== manifest.length) failures.push('Duplicate route in programmatic manifest');

const families = new Set(manifest.map((item) => item.family));
for (const family of ['length-hub', 'category-hub', 'letter-hub', 'length-letter', 'start-end', 'position', 'digram']) {
  if (!families.has(family)) failures.push(`Missing generated family: ${family}`);
  if (!manifest.some((item) => item.family === family && item.indexable)) failures.push(`No indexable routes in family: ${family}`);
}

for (const length of [2, 3, 4, 5, 6, 7, 8]) {
  for (const type of ['starting', 'ending', 'containing']) {
    if (!manifest.some((item) => item.family === 'length-letter' && item.length === length && item.type === type)) {
      failures.push(`Missing length-letter family for ${length}/${type}`);
    }
  }
}
for (const length of Array.from({ length: 14 }, (_, i) => i + 2)) {
  if (!manifest.some((item) => item.family === 'length-hub' && item.length === length && item.indexable)) {
    failures.push(`Missing indexable ${length}-letter hub`);
  }
}

const sitemap = [...sitemapRoutes('sitemap.xml'), ...sitemapRoutes('sitemap-guides.xml')];
const uniqueSitemap = new Set(sitemap);
if (uniqueSitemap.size !== sitemap.length) failures.push('Duplicate URL found across sitemap files');
if (uniqueSitemap.size > 50000) failures.push(`Sitemap exceeds 50,000 URL limit: ${uniqueSitemap.size}`);
if (stats.sitemap && !uniqueSitemap.has('/guides/')) failures.push('Guide sitemap is not represented in combined sitemap set');

for (const item of indexable) {
  if (!uniqueSitemap.has(item.route)) failures.push(`Indexable generated route missing from sitemap: ${item.route}`);
}
for (const item of noindex) {
  if (uniqueSitemap.has(item.route)) failures.push(`Noindex generated route present in sitemap: ${item.route}`);
}

const required = [
  '/', '/word-finder/', '/anagram-solver/', '/wordle-solver/', '/crossword-solver/', '/word-lists/',
  '/words-that-start-with/', '/words-that-end-with/', '/words-containing/',
  '/2-letter-words/', '/5-letter-words/', '/8-letter-words/', '/15-letter-words/', '/guides/'
];
for (const route of required) {
  if (!uniqueSitemap.has(route)) failures.push(`Required route missing from sitemaps: ${route}`);
}

for (const item of manifest) {
  const file = routeToFile(item.route);
  if (!exists(file)) {
    failures.push(`Generated route missing index.html: ${item.route}`);
    continue;
  }
  const html = read(file);
  const title = grab(html, /<title>([^<]+)<\/title>/i);
  const description = grab(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || grab(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const canonical = grab(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || grab(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const robots = grab(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
    || grab(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
  const h1Count = (html.match(/<h1\b[^>]*>/gi) || []).length;

  if (!title) failures.push(`Missing title: ${item.route}`);
  if (description.length < 70) failures.push(`Short/missing description: ${item.route}`);
  if (canonical !== `${origin}${item.route}`) failures.push(`Incorrect canonical: ${item.route}`);
  if (h1Count !== 1) failures.push(`Expected one H1 on ${item.route}, found ${h1Count}`);
  if (!html.includes('data-content-tier="programmatic"')) failures.push(`Missing programmatic content marker: ${item.route}`);
  if (item.indexable && (!/index,follow/i.test(robots) || /noindex/i.test(robots))) failures.push(`Indexable route has wrong robots: ${item.route}`);
  if (!item.indexable && !/noindex,follow/i.test(robots)) failures.push(`Quality-gated route is missing noindex,follow: ${item.route}`);
  if (!html.includes('<nav class="breadcrumb" aria-label="Breadcrumb">')) failures.push(`Missing breadcrumb: ${item.route}`);
  if (!html.includes('"@type":"BreadcrumbList"')) failures.push(`Missing BreadcrumbList: ${item.route}`);
  if (!html.includes('class="brand-logo" src="/assets/wordunscramble-logo.png"')) failures.push(`Missing logo: ${item.route}`);
  if (!html.includes('<nav><a href="/">Unscrambler</a><a href="/wordle-solver/">Wordle Solver</a>')) failures.push(`Missing standard navigation: ${item.route}`);
  if (!html.includes('<div class="footerlinks"><a href="/guides/">Guides</a>')) failures.push(`Missing standard footer: ${item.route}`);
  if (!html.includes('property="og:url"') || !html.includes('name="twitter:card" content="summary_large_image"')) failures.push(`Missing social metadata: ${item.route}`);
  if (/(?:google-adsense-account|pagead2\.googlesyndication\.com)/i.test(html)) failures.push(`Generated list page contains advertising code: ${item.route}`);
}

for (const route of uniqueSitemap) {
  const file = routeToFile(route);
  if (!exists(file)) {
    failures.push(`Sitemap route missing file: ${route}`);
    continue;
  }
  const html = read(file);
  const robots = grab(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
    || grab(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
  if (/noindex/i.test(robots)) failures.push(`Sitemap route is noindex: ${route}`);
}

const homepage = read('index.html');
const wordLists = read('word-lists/index.html');
for (const route of ['/words-that-start-with/', '/words-that-end-with/', '/words-containing/']) {
  if (!homepage.includes(`href="${route}"`)) failures.push(`Homepage does not link to ${route}`);
  if (!wordLists.includes(`href="${route}"`)) failures.push(`Word Lists does not link to ${route}`);
}

const middleware = read('functions/_middleware.js');
for (const marker of ['thinIndexPath', 'lowValueListPath', 'noindex,follow']) {
  if (!middleware.includes(marker)) failures.push(`Middleware safeguard missing: ${marker}`);
}
if (middleware.includes('promotedFiveLetterPath')) failures.push('Legacy promotedFiveLetterPath remains in middleware');
if (/thinIndexPath[^\n]*\[23678\]-letter-words/.test(middleware)) failures.push('Legacy 2/3/6/7/8 hub noindex rule remains in middleware');

const legacyApply = read('scripts/apply-indexing-policy.cjs');
if (!legacyApply.includes("require('./apply-indexing-policy-v2.cjs')")) failures.push('Legacy indexing script is not delegated to v2 policy');

const robotsText = read('robots.txt');
for (const sitemapFile of ['sitemap.xml', 'sitemap-guides.xml']) {
  if (!robotsText.includes(`Sitemap: ${origin}/${sitemapFile}`)) failures.push(`robots.txt missing ${sitemapFile}`);
}

if (generatedRoutes.size !== manifest.length) failures.push('Generated route set does not match manifest length');

console.log(`Programmatic SEO integrity: ${manifest.length} generated routes (${indexable.length} indexable / ${noindex.length} noindex), ${uniqueSitemap.size} URLs across sitemaps.`);
if (failures.length) {
  console.error(`\nFAILURES\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Programmatic SEO integrity passed.');
