#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const skippedDirs = new Set(['.git', 'node_modules']);

const replacements = [
  ['Quick answer: common matches', 'Quick answer: common-use matches'],
  ['Start with familiar words, then use the broader list or a solver when the obvious answer is not enough.', "These examples come from the site's corpus-derived common-use subset; use the broader list or a solver when you need more coverage."],
  ['Familiar words are shown first, followed by a broader sample from the English word list.', 'Common-use matches are shown first, followed by a broader sample from the English word list.'],
  ['with familiar examples first.', 'with common-use examples first.'],
  ['common examples', 'common-use examples'],
  ['common matches</span>', 'common-use matches</span>'],
  ['No common matches in this word list.', 'No common-use matches in this word list.'],
  ['marked as common English words', 'included in the common-use subset'],
  ['common-word matches', 'common-use matches'],
  ['know the word is containing ', 'know the word contains '],
  ['know the word is starting with ', 'know the word starts with '],
  ['know the word is ending with ', 'know the word ends with '],
  ['Browse starting with A-Z', 'Browse starting letters A-Z'],
  ['Browse ending with A-Z', 'Browse ending letters A-Z'],
  ['Browse containing A-Z', 'Browse required letters A-Z'],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.name === 'index.html') {
      out.push(full);
    }
  }
  return out;
}

let processed = 0;
let changed = 0;
const leftovers = [];

for (const file of walk(root)) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('data-content-tier="programmatic"')) continue;
  processed += 1;
  const before = html;

  for (const [from, to] of replacements) {
    html = html.split(from).join(to);
  }

  if (
    html.includes('know the word is containing ') ||
    html.includes('know the word is starting with ') ||
    html.includes('know the word is ending with ') ||
    html.includes('Start with familiar words, then use the broader list')
  ) {
    leftovers.push(path.relative(root, file));
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed += 1;
  }
}

if (leftovers.length) {
  console.error('Programmatic copy normalization left stale wording in:');
  for (const file of leftovers) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`Programmatic copy normalization complete: ${processed} pages checked, ${changed} pages updated.`);
