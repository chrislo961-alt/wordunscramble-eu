#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sitemapFiles = ['sitemap.xml', 'sitemap-guides.xml'];
const routes = new Set();

for (const sitemap of sitemapFiles) {
  const xml = fs.readFileSync(path.join(root, sitemap), 'utf8');
  for (const match of xml.matchAll(/<loc>https:\/\/wordunscramble\.eu([^<]*)<\/loc>/g)) {
    routes.add(match[1]);
  }
}

function fileForRoute(route) {
  return route === '/'
    ? path.join(root, 'index.html')
    : path.join(root, route.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
}

function readMeta(html, pattern, label, route) {
  const value = html.match(pattern)?.[1]?.trim();
  if (!value) throw new Error(`Missing ${label} on ${route}`);
  return value;
}

let updated = 0;
for (const route of routes) {
  const file = fileForRoute(route);
  let html = fs.readFileSync(file, 'utf8');
  const title = readMeta(html, /<title>([^<]+)<\/title>/i, 'title', route);
  const description = readMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i, 'description', route);
  const canonical = readMeta(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i, 'canonical', route);

  if (/property=["']og:title["']/i.test(html)) {
    html = html.replaceAll('https://wordunscramble.eu/social-card.svg', 'https://wordunscramble.eu/social-card.png');
  } else {
    const canonicalTag = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0];
    if (!canonicalTag) throw new Error(`Missing canonical tag on ${route}`);
    const social = [
      '<meta property="og:type" content="website">',
      '<meta property="og:site_name" content="WordUnscramble.eu">',
      `<meta property="og:title" content="${title.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">`,
      `<meta property="og:description" content="${description.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">`,
      `<meta property="og:url" content="${canonical}">`,
      '<meta property="og:image" content="https://wordunscramble.eu/social-card.png">',
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta property="og:image:alt" content="WordUnscramble.eu — Letters in. Words out.">',
      '<meta name="twitter:card" content="summary_large_image">',
      '<meta name="twitter:image" content="https://wordunscramble.eu/social-card.png">',
    ].join('');
    html = html.replace(canonicalTag, canonicalTag + social);
  }
  fs.writeFileSync(file, html);
  updated++;
}

console.log(`Social metadata updated on ${updated} indexable pages.`);
