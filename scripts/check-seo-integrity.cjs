#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const origin = 'https://wordunscramble.eu';
const sitemapFiles = ['sitemap.xml', 'sitemap-guides.xml'];
const failures = [];
const promotedRoutes = new Set(JSON.parse(read('data/indexable-five-letter-routes.json')));

function routeToFile(route) {
  return route === '/'
    ? path.join(root, 'index.html')
    : path.join(root, route.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function match(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || null;
}

function parseJsonLd(html, route) {
  const blocks = [];
  for (const found of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(found[1]));
    } catch {
      failures.push(`Invalid JSON-LD: ${route}`);
    }
  }
  return blocks.flatMap((block) => Array.isArray(block) ? block : [block]);
}

function isRuntimeNoindex(route) {
  return /^\/(?:[23678]-letter-words|5-letter-words-(?:starting-with|ending-with|containing)-[a-z]|words-with-(?:q|x|z))\/?$/i.test(route)
    && !promotedRoutes.has(route);
}

function isLowValueList(route) {
  return /^\/(?:\d+-letter-words(?:\/[a-z-]*)?|\d+-letter-words-(?:starting|ending|containing)[^/]*|words-(?:with|ending|starting)[^/]*)\/?$/i.test(route);
}

const sitemapRoutes = [];
for (const file of sitemapFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`Missing sitemap file: ${file}`);
    continue;
  }
  const xml = read(file);
  for (const found of xml.matchAll(/<loc>(https:\/\/wordunscramble\.eu[^<]*)<\/loc>/g)) {
    const url = new URL(found[1]);
    const route = url.pathname.endsWith('/') || path.extname(url.pathname) ? url.pathname : `${url.pathname}/`;
    sitemapRoutes.push(route);
  }
}

const uniqueRoutes = new Set(sitemapRoutes);
if (uniqueRoutes.size !== sitemapRoutes.length) failures.push('Duplicate URL found across sitemap files');
if (uniqueRoutes.size < 59) failures.push(`Curated sitemap coverage unexpectedly small: ${uniqueRoutes.size} URLs`);

for (const required of ['/','/word-finder/','/anagram-solver/','/wordle-solver/','/crossword-solver/','/word-lists/','/4-letter-words/','/5-letter-words/','/9-letter-words/','/words-ending-in-ing/','/guides/']) {
  if (!uniqueRoutes.has(required)) failures.push(`Required search hub missing from sitemaps: ${required}`);
}
for (const route of promotedRoutes) {
  if (!uniqueRoutes.has(route)) failures.push(`Promoted content page missing from sitemap: ${route}`);
}

for (const route of uniqueRoutes) {
  if (isRuntimeNoindex(route)) failures.push(`Runtime-noindex route present in sitemap: ${route}`);
  const file = routeToFile(route);
  if (!fs.existsSync(file)) {
    failures.push(`Sitemap route missing index.html: ${route}`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const title = match(html, /<title>([^<]+)<\/title>/i);
  const description = match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || match(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const canonical = match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || match(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const h1Count = (html.match(/<h1\b[^>]*>/gi) || []).length;
  const robots = match(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
    || match(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)
    || '';
  const ogTitle = match(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogDescription = match(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const ogUrl = match(html, /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
  const ogImage = match(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const twitterCard = match(html, /<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i);
  const jsonLd = parseJsonLd(html, route);

  if (!title) failures.push(`Missing title: ${route}`);
  if (!description) failures.push(`Missing meta description: ${route}`);
  if (h1Count !== 1) failures.push(`Expected exactly one H1 on ${route}, found ${h1Count}`);
  if (/noindex/i.test(robots)) failures.push(`Static noindex route present in sitemap: ${route}`);
  const expectedCanonical = origin + route;
  if (!canonical) failures.push(`Missing canonical: ${route}`);
  else if (canonical !== expectedCanonical) failures.push(`Non-self canonical: ${route} -> ${canonical}`);
  if (!ogTitle) failures.push(`Missing Open Graph title: ${route}`);
  if (!ogDescription) failures.push(`Missing Open Graph description: ${route}`);
  if (ogUrl !== expectedCanonical) failures.push(`Incorrect Open Graph URL: ${route} -> ${ogUrl || 'missing'}`);
  if (ogImage !== `${origin}/social-card.png`) failures.push(`Incorrect Open Graph image: ${route}`);
  if (twitterCard !== 'summary_large_image') failures.push(`Missing large Twitter card: ${route}`);
  if (route === '/') {
    const website = jsonLd.find((item) => item?.['@type'] === 'WebSite');
    if (!website || website.name !== 'WordUnscramble.eu' || website.url !== `${origin}/`) {
      failures.push('Homepage is missing the preferred WebSite identity');
    }
  } else {
    if (!html.includes('<nav class="breadcrumb" aria-label="Breadcrumb">')) {
      failures.push(`Missing semantic breadcrumb navigation: ${route}`);
    }
    if (!html.includes('aria-current="page"')) {
      failures.push(`Breadcrumb does not identify the current page: ${route}`);
    }
    const breadcrumb = jsonLd.find((item) => item?.['@type'] === 'BreadcrumbList');
    const items = breadcrumb?.itemListElement;
    if (!Array.isArray(items) || items.length < 2) {
      failures.push(`Missing BreadcrumbList structured data: ${route}`);
    } else {
      const last = items.at(-1);
      if (last?.position !== items.length || last?.item !== expectedCanonical) {
        failures.push(`Incorrect final breadcrumb item: ${route}`);
      }
    }
  }
}

const middleware = read('functions/_middleware.js');
for (const marker of ['thinIndexPath', 'lowValueListPath', 'noindex,follow']) {
  if (!middleware.includes(marker)) failures.push(`Middleware quality safeguard missing: ${marker}`);
}
const redirects = read('_redirects');
for (const route of ['/word-unscrambler', '/word-unscrambler/', '/free-word-unscrambler', '/free-word-unscrambler/']) {
  if (!redirects.includes(`${route} / 301`)) failures.push(`Missing canonical redirect: ${route}`);
}
if (!middleware.includes('const primaryNav = \'<nav><a href="/">Unscrambler</a>')) {
  failures.push('Primary navigation does not point Unscrambler at the canonical homepage');
}

for (const hub of ['word-lists/index.html', '5-letter-words/index.html']) {
  const html = read(hub);
  for (const found of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    let route;
    try { route = new URL(found[1], origin + '/').pathname; } catch { continue; }
    if (isRuntimeNoindex(route)) failures.push(`${hub} links directly to runtime-noindex inventory: ${route}`);
  }
}
const fiveLetterHub = read('5-letter-words/index.html');
for (const route of promotedRoutes) {
  if (!fiveLetterHub.includes(`href="${route}"`)) failures.push(`5-letter hub does not link to promoted page: ${route}`);
}

for (const file of fs.readdirSync(root, { recursive: true })) {
  if (!file.endsWith('index.html')) continue;
  const html = read(file);
  if (/href=["']\/word-unscrambler\/["']/i.test(html)) {
    failures.push(`Legacy unscrambler link found: ${file}`);
  }
  const route = file === 'index.html' ? '/' : `/${file.replace(/\/index\.html$/, '')}/`;
  const robots = match(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
    || match(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)
    || '';
  if (isRuntimeNoindex(route) && !/noindex,follow/i.test(robots)) {
    failures.push(`Thin page missing static noindex: ${route}`);
  }
  if (promotedRoutes.has(route)) {
    if (!/index,follow/i.test(robots) || /noindex/i.test(robots)) failures.push(`Promoted page is not indexable: ${route}`);
    if (!html.includes('data-content-tier="curated"')) failures.push(`Promoted page is missing curated content marker: ${route}`);
    if (!html.includes('<h2>Quick answer: common matches</h2>')) failures.push(`Promoted page is missing quick answers: ${route}`);
    if (!html.includes('<h2>Frequently asked questions</h2>')) failures.push(`Promoted page is missing FAQ content: ${route}`);
  }
  if (isLowValueList(route) && /(?:google-adsense-account|pagead2\.googlesyndication\.com)/i.test(html)) {
    failures.push(`List page still loads advertising code: ${route}`);
  }
  if (!html.includes('class="brand-logo" src="/assets/wordunscramble-logo.png"')) {
    failures.push(`Page missing standard logo: ${route}`);
  }
  if (!html.includes('<nav><a href="/">Unscrambler</a><a href="/wordle-solver/">Wordle Solver</a>')) {
    failures.push(`Page missing standard navigation: ${route}`);
  }
  if (!html.includes('<div class="footerlinks"><a href="/guides/">Guides</a>')) {
    failures.push(`Page missing standard footer: ${route}`);
  }
  for (const marker of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/manifest.webmanifest', 'name="theme-color" content="#315f9f"']) {
    if (!html.includes(marker)) failures.push(`Page missing shared head marker ${marker}: ${route}`);
  }
}

const robots = read('robots.txt');
for (const sitemap of sitemapFiles) {
  if (!robots.includes(`Sitemap: ${origin}/${sitemap}`)) failures.push(`robots.txt missing ${sitemap} declaration`);
}

const manifest = JSON.parse(read('manifest.webmanifest'));
if (manifest.theme_color !== '#315f9f') failures.push('Manifest theme color does not match the site theme');
for (const icon of [
  ['/apple-touch-icon.png', 'apple touch icon'],
  ['/icon-192.png', '192px PWA icon'],
  ['/icon-512.png', '512px PWA icon'],
]) {
  if (!fs.existsSync(path.join(root, icon[0].slice(1)))) failures.push(`Missing ${icon[1]}`);
}
for (const size of ['192x192', '512x512']) {
  if (!manifest.icons?.some((icon) => icon.sizes === size && icon.type === 'image/png')) {
    failures.push(`Manifest missing ${size} PNG icon`);
  }
}
if (!middleware.includes('rel="apple-touch-icon" href="/apple-touch-icon.png"')) {
  failures.push('Middleware does not add the Apple touch icon');
}

console.log(`SEO integrity: ${uniqueRoutes.size} curated sitemap URLs checked across ${sitemapFiles.length} sitemaps.`);
if (failures.length) {
  console.error('\nFAILURES\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('SEO integrity passed.');
