#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const thinIndexPath = /^\/(?:[23678]-letter-words|5-letter-words-(?:starting-with|ending-with|containing)-[a-z]|words-with-(?:q|x|z))\/?$/i;

let updated = 0;
for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || entry.name !== 'index.html') continue;
  const file = path.join(entry.parentPath, entry.name);
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  const route = relative === 'index.html' ? '/' : `/${relative.replace(/\/index\.html$/, '')}/`;
  if (!thinIndexPath.test(route)) continue;

  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/\s*<meta\s+name=["']robots["'][^>]*>/gi, '');
  html = html.replace(/<\/head>/i, '<meta name="robots" content="noindex,follow"></head>');
  fs.writeFileSync(file, html);
  updated++;
}

console.log(`Static noindex policy applied to ${updated} thin pages.`);
