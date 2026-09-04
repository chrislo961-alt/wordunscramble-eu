#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const brand = '<a class="brand" href="/" aria-label="WordUnscramble.eu home"><img class="brand-logo" src="/assets/wordunscramble-logo.png" alt="WordUnscramble.eu" width="260" height="48"></a>';
const nav = '<nav><a href="/">Unscrambler</a><a href="/wordle-solver/">Wordle Solver</a><a href="/crossword-solver/">Crossword Solver</a><a href="/guides/">Guides</a></nav>';
const footer = '<div class="footerlinks"><a href="/guides/">Guides</a><a href="/about/">About</a><a href="/how-it-works/">How it works</a><a href="/editorial-policy/">Editorial policy</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a></div>';

let updated = 0;
for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || entry.name !== 'index.html') continue;
  const file = path.join(entry.parentPath, entry.name);
  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  html = html.replace(
    /<a\s+class=["']brand["']\s+href=["']\/["'][^>]*>[\s\S]*?<\/a>/i,
    brand,
  );
  html = html.replace(
    /(<header[^>]*>[\s\S]*?<div\s+class=["']shell nav["'][^>]*>[\s\S]*?)<nav>[\s\S]*?<\/nav>/i,
    `$1${nav}`,
  );
  html = html.replace(/<div\s+class=["']footerlinks["'][^>]*>[\s\S]*?<\/div>/i, footer);

  const shared = [];
  if (!/rel=["']icon["']/i.test(html)) shared.push('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
  if (!/rel=["']alternate icon["']/i.test(html)) shared.push('<link rel="alternate icon" href="/favicon.ico">');
  if (!/rel=["']apple-touch-icon["']/i.test(html)) shared.push('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
  if (!/manifest\.webmanifest/i.test(html)) shared.push('<link rel="manifest" href="/manifest.webmanifest">');
  if (!/name=["']theme-color["']/i.test(html)) shared.push('<meta name="theme-color" content="#315f9f">');
  if (shared.length) html = html.replace(/<\/head>/i, `${shared.join('')}</head>`);

  if (html !== before) {
    fs.writeFileSync(file, html);
    updated++;
  }
}

console.log(`Static site chrome updated on ${updated} pages.`);
