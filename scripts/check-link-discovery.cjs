#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const origin = 'https://wordunscramble.eu';
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const submitted = new Set(['sitemap.xml', 'sitemap-guides.xml'].flatMap((file) =>
  [...read(file).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
));
const links = new Map();
const incoming = new Map();

for (const route of submitted) {
  const file = route === '/' ? 'index.html' : `${route.slice(1)}index.html`;
  const html = read(file);
  const destinations = new Set();
  for (const tag of html.matchAll(/<a\b[^>]*>/gi)) {
    if (/\brel=["'][^"']*\bnofollow\b/i.test(tag[0])) continue;
    const href = tag[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    let url;
    try { url = new URL(href.replaceAll('&amp;', '&'), origin + route); } catch { continue; }
    if (url.origin !== origin) continue;
    const destination = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
    if (destination !== route && submitted.has(destination)) destinations.add(destination);
  }
  links.set(route, destinations);
  for (const destination of destinations) incoming.set(destination, (incoming.get(destination) || 0) + 1);
}

const distances = new Map([['/', 0]]);
const queue = ['/'];
for (let i = 0; i < queue.length; i++) {
  const route = queue[i];
  for (const destination of links.get(route) || []) {
    if (distances.has(destination)) continue;
    distances.set(destination, distances.get(route) + 1);
    queue.push(destination);
  }
}

const unreachable = [...submitted].filter((route) => !distances.has(route));
const orphans = [...submitted].filter((route) => route !== '/' && !incoming.has(route));
const maxDepth = Math.max(...distances.values());
const report = { sitemapUrls: submitted.size, reachable: distances.size, orphanCount: orphans.length, unreachableCount: unreachable.length, maxDepth };
console.log('Internal link discovery:', JSON.stringify(report));
if (unreachable.length || orphans.length) {
  console.error('FAIL sitemap pages must be reachable from the homepage through crawlable links on submitted pages.');
  console.error('Examples:', unreachable.slice(0, 10).join(', '));
  process.exitCode = 1;
}

module.exports = { ...report, unreachable, orphans };
