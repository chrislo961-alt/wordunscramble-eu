#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const promotedRoutes = new Set(JSON.parse(fs.readFileSync(path.join(root, 'data/indexable-five-letter-routes.json'), 'utf8')));
const thinIndexPath = /^\/(?:[23678]-letter-words|5-letter-words-(?:starting-with|ending-with|containing)-[a-z]|words-with-(?:q|x|z))\/?$/i;
const lowValueListPath = /^\/(?:\d+-letter-words(?:\/[a-z-]*)?|\d+-letter-words-(?:starting|ending|containing)[^/]*|words-(?:with|ending|starting)[^/]*)\/?$/i;

let noindexed = 0;
let adsRemoved = 0;
for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || entry.name !== 'index.html') continue;
  const file = path.join(entry.parentPath, entry.name);
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  const route = relative === 'index.html' ? '/' : `/${relative.replace(/\/index\.html$/, '')}/`;
  const isThin = thinIndexPath.test(route) && !promotedRoutes.has(route);
  const isLowValueList = lowValueListPath.test(route);
  if (!isThin && !isLowValueList) continue;

  let html = fs.readFileSync(file, 'utf8');
  if (isLowValueList) {
    const before = html;
    html = html
      .replace(/\s*<meta\s+name=["']google-adsense-account["'][^>]*>/gi, '')
      .replace(/\s*<script[^>]*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/gi, '');
    if (html !== before) adsRemoved++;
  }
  if (isThin) {
    html = html.replace(/\s*<meta\s+name=["']robots["'][^>]*>/gi, '');
    if (/<link\s+rel=["']icon["']/i.test(html)) {
      html = html.replace(/<link\s+rel=["']icon["']/i, '<meta name="robots" content="noindex,follow"><link rel="icon"');
    } else {
      html = html.replace(/<\/head>/i, '<meta name="robots" content="noindex,follow"></head>');
    }
    noindexed++;
  }
  fs.writeFileSync(file, html);
}

console.log(`Static policy applied: ${noindexed} thin pages noindexed; ads removed from ${adsRemoved} list pages.`);
