#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const legacy = fs.readFileSync(path.join(root, 'word-unscrambler/index.html'), 'utf8');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

const homepageCanonical = homepage.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1];
if (homepageCanonical === 'https://wordunscramble.eu/') pass('homepage owns canonical word-unscrambler intent');
else fail(`homepage canonical is ${homepageCanonical || 'missing'}`);

const legacyCanonical = legacy.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1];
if (legacyCanonical === 'https://wordunscramble.eu/') pass('/word-unscrambler/ consolidates to homepage canonical');
else fail(`/word-unscrambler/ canonical is ${legacyCanonical || 'missing'}`);

if (!sitemap.includes('https://wordunscramble.eu/word-unscrambler/')) pass('legacy duplicate is excluded from sitemap');
else fail('legacy /word-unscrambler/ is still submitted in sitemap');

let duplicateLinks = 0;
for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || entry.name !== 'index.html') continue;
  const file = path.join(entry.parentPath, entry.name);
  const html = fs.readFileSync(file, 'utf8');
  duplicateLinks += (html.match(/href=["']\/word-unscrambler\/["']/gi) || []).length;
}
if (duplicateLinks === 0) pass('internal links point directly to the homepage instead of the canonicalized duplicate');
else fail(`${duplicateLinks} internal links still point at /word-unscrambler/`);

for (const [label, href] of [
  ['Word Unscrambler', '/'],
  ['Anagram Solver', '/anagram-solver/'],
  ['Word Finder', '/word-finder/'],
]) {
  if (homepage.includes(`href="${href}"`) && homepage.includes(`>${label}</a>`)) pass(`homepage visibly links to ${label}`);
  else fail(`homepage missing visible ${label} ownership link`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log('Search intent ownership checks passed.');
