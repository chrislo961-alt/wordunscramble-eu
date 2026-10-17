#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const middleware = read('functions/_middleware.js');
const sandbox = { URL, Response, Headers };
vm.createContext(sandbox);
vm.runInContext(middleware.replace('export async function onRequest', 'async function onRequest'), sandbox);

async function deliver(url, body, type = 'text/html') {
  return sandbox.onRequest({
    request: { url },
    next: async () => new Response(body, { headers: { 'content-type': type } }),
  });
}

async function run() {
  const failures = [];
  const required = ['/', '/anagram-solver/', '/word-finder/'];
  for (const route of ['/', '/anagram-solver/', '/word-finder/', '/5-letter-words-starting-with-s/']) {
    const file = route === '/' ? 'index.html' : `${route.slice(1)}index.html`;
    const response = await deliver(`https://wordunscramble.eu${route}`, read(file));
    const html = await response.text();
    assert.equal(response.status, 200);
    const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i)?.[1] || '';
    const footer = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i)?.[1] || '';
    for (const href of required) {
      for (const [name, section] of [['header', header], ['footer', footer]]) {
        if (!section.includes(`href="${href}"`)) failures.push(`${route}: delivered ${name} omits ${href}`);
      }
    }
  }

  for (const url of ['http://wordunscramble.eu/word-finder/?letters=listen', 'https://www.wordunscramble.eu/word-finder/?letters=listen']) {
    const response = await deliver(url, '');
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), 'https://wordunscramble.eu/word-finder/?letters=listen');
  }
  const legacy = await deliver('https://wordunscramble.eu/word-unscrambler/?letters=stare', '');
  assert.equal(legacy.headers.get('location'), 'https://wordunscramble.eu/?letters=stare');

  const noindex = await deliver('https://wordunscramble.eu/words-with-q/', read('words-with-q/index.html'));
  assert.match(await noindex.text(), /<meta name="robots" content="noindex,follow">/);
  const robots = read('robots.txt');
  const plain = await deliver('https://wordunscramble.eu/robots.txt', robots, 'text/plain');
  assert.equal(await plain.text(), robots);

  const sitemap = read('sitemap.xml');
  for (const route of ['/', '/anagram-solver/', '/6-letter-anagram-solver/', '/phrase-anagram-solver/']) {
    const html = read(route === '/' ? 'index.html' : `${route.slice(1)}index.html`);
    const entry = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].find((m) => m[1].includes(`<loc>https://wordunscramble.eu${route}</loc>`));
    const lastmod = entry?.[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    assert.ok(lastmod, `Missing sitemap date: ${route}`);
    for (const m of html.matchAll(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g)) {
      if (m[1] > lastmod) failures.push(`${route}: sitemap date ${lastmod} predates declared content update ${m[1]}`);
    }
  }
  assert.equal(failures.length, 0, failures.join('\n'));
  console.log('Runtime SEO checks passed: core navigation, redirects, robots and sitemap dates.');
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
