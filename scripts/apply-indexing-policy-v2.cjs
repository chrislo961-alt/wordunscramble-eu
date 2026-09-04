#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifestFile = path.join(root, 'data/programmatic-seo-routes.json');
if (!fs.existsSync(manifestFile)) {
  console.error('Missing data/programmatic-seo-routes.json. Run scripts/build-programmatic-seo.cjs first.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
let updated = 0;
let adsRemoved = 0;

for (const item of manifest) {
  const relative = item.route.replace(/^\//, '').replace(/\/$/, '');
  const file = path.join(root, relative, 'index.html');
  if (!fs.existsSync(file)) continue;

  let html = fs.readFileSync(file, 'utf8');
  const beforeAds = html;
  html = html
    .replace(/\s*<meta\s+name=["']google-adsense-account["'][^>]*>/gi, '')
    .replace(/\s*<script[^>]*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/gi, '');
  if (html !== beforeAds) adsRemoved++;

  html = html.replace(/\s*<meta\s+name=["']robots["'][^>]*>/gi, '');
  const robots = item.indexable ? 'index,follow' : 'noindex,follow';
  html = html.replace(/<\/head>/i, `<meta name="robots" content="${robots}"></head>`);
  fs.writeFileSync(file, html);
  updated++;
}

console.log(`Programmatic indexing policy applied to ${updated} pages; advertising removed from ${adsRemoved} pages.`);
