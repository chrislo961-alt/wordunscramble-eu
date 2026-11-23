#!/usr/bin/env node
// Recompute the published research table from the exact word files used by the site.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const common = new Set(read('data/common.txt').split(/\s+/).filter(Boolean));
const expected = {
  4: { broad: 5595, common: 1719, repeats: 340 },
  5: { broad: 11846, common: 2365, repeats: 779 },
  6: { broad: 18195, common: 2753, repeats: 1385 },
  7: { broad: 25388, common: 2680, repeats: 1832 },
};
const guide = read('guides/word-list-pattern-study/index.html');
for (const [lengthText, want] of Object.entries(expected)) {
  const length = Number(lengthText);
  const broad = [...new Set(read(`data/w${length}.txt`).trim().split(/\s+/).filter(w => new RegExp(`^[a-z]{${length}}$`).test(w)))];
  const selected = broad.filter(word => common.has(word));
  const repeats = selected.filter(word => new Set(word).size < word.length).length;
  assert.equal(broad.length, want.broad, `${length}-letter broad count changed; update the article`);
  assert.equal(selected.length, want.common, `${length}-letter Common count changed; update the article`);
  assert.equal(repeats, want.repeats, `${length}-letter repeated count changed; update the article`);
  for (const val of [want.broad, want.common, want.repeats]) {
    assert.ok(guide.includes(new Intl.NumberFormat('en-US').format(val)), `Missing visible study value: ${val}`);
  }
}
const five = new Set(read('data/w5.txt').trim().split(/\s+/).filter(w => common.has(w)));
const commonFive = [...five];
assert.equal(commonFive.filter(w => [...w].filter(ch => 'aeiou'.includes(ch)).length === 2).length, 1336);
assert.equal(commonFive.filter(w => w[0] === 's').length, 341);
assert.equal(commonFive.filter(w => w[4] === 's').length, 615);
assert.match(guide, /<link rel="canonical" href="https:\/\/wordunscramble\.eu\/guides\/word-list-pattern-study\/">/);
assert.match(guide, /<nav class="breadcrumb" aria-label="Breadcrumb">/);
assert.match(guide, /"@type":"BreadcrumbList"/);
assert.match(guide, /not the probabilities of an official Wordle answer/);
assert.match(read('guides/index.html'), /href="\/guides\/word-list-pattern-study\/"/);
assert.match(read('index.html'), /href="\/guides\/word-list-pattern-study\/"/);
assert.match(read('sitemap-guides.xml'), /<loc>https:\/\/wordunscramble\.eu\/guides\/word-list-pattern-study\/<\/loc>/);
assert.match(read('ads.txt'), /^google\.com, pub-9212084765206199, DIRECT, f08c47fec0942fa0/m);
// Do not expand programmatic indexation merely to improve AdSense appearance.
const manifest = JSON.parse(read('data/programmatic-seo-routes.json'));
const indexable = manifest.filter(item => item.indexable).length;
assert.ok(indexable <= 484, `Programmatic indexation grew to ${indexable}; require editorial review`);
console.log('Original data guide is reproducible, linked and included in sitemap.');
