#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const origin = 'https://wordunscramble.eu';
const today = new Date().toISOString().slice(0, 10);
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
const lengths = Array.from({ length: 14 }, (_, i) => i + 2);
const filterLengths = [2, 3, 4, 5, 6, 7, 8];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function write(relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function wordsFrom(relative) {
  return read(relative)
    .trim()
    .split(/\s+/)
    .map((word) => word.toLowerCase())
    .filter((word) => /^[a-z]+$/.test(word));
}

function uniq(values) {
  return [...new Set(values)];
}

function sampleEven(words, limit) {
  const clean = uniq(words);
  if (clean.length <= limit) return clean;
  return Array.from({ length: limit }, (_, index) => clean[Math.floor(index * clean.length / limit)]);
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function titleWords(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function wordGrid(words) {
  if (!words.length) return '<p class="muted">No common matches in this word list. Try the broader Word Finder.</p>';
  return `<div class="wordgrid">${words.map((word) => `<div class="word">${esc(word)}</div>`).join('')}</div>`;
}

function linkGrid(links) {
  if (!links.length) return '';
  return `<div class="links">${links.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join('')}</div>`;
}

const broadByLength = new Map();
for (const length of lengths) {
  broadByLength.set(length, wordsFrom(`data/w${length}.txt`));
}
const allBroad = lengths.flatMap((length) => broadByLength.get(length));
const commonSet = new Set(wordsFrom('data/common.txt'));
const commonByLength = new Map(
  lengths.map((length) => [length, broadByLength.get(length).filter((word) => commonSet.has(word))])
);
const allCommon = lengths.flatMap((length) => commonByLength.get(length));

const manifest = [];

function addManifest(route, family, indexable, broadCount, commonCount, extra = {}) {
  manifest.push({
    route,
    family,
    indexable,
    broadCount,
    commonCount,
    ...extra,
  });
}

function crumbs(items) {
  return items.map(([name, item], index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name,
    item: `${origin}${item}`,
  }));
}

function renderPage({
  route,
  title,
  description,
  h1 = title,
  intro,
  broadMatches = [],
  commonMatches = [],
  indexable = true,
  family = 'programmatic',
  breadcrumbItems = [],
  primaryHeading = 'Quick answer: common matches',
  primaryText = 'Start with familiar words, then use the broader list or a solver when the obvious answer is not enough.',
  secondaryHeading = 'More matching words',
  secondaryText = 'This sample is spread across the broader English list so you can scan more possibilities without loading an enormous page.',
  customSections = '',
  related = [],
  faqs = [],
}) {
  const canonical = `${origin}${route}`;
  const quick = sampleEven(commonMatches, 48);
  const more = sampleEven(broadMatches, 180);
  const breadcrumb = crumbs([
    ['Home', '/'],
    ...breadcrumbItems,
    [h1, route],
  ]);

  const breadcrumbHtml = [
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a>',
    ...breadcrumbItems.map(([name, href]) => ` <span aria-hidden="true">/</span> <a href="${href}">${esc(name)}</a>`),
    ` <span aria-hidden="true">/</span> <span aria-current="page">${esc(h1)}</span></nav>`,
  ].join('');

  const faqHtml = faqs.length
    ? `<h2>Frequently asked questions</h2>${faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}`
    : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | WordUnscramble.eu</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="WordUnscramble.eu"><meta property="og:title" content="${esc(title)} | WordUnscramble.eu"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${origin}/social-card.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="WordUnscramble.eu - letters in, words out"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${origin}/social-card.png"><link rel="stylesheet" href="/assets/style.css?v=20260904-seo2"><meta name="robots" content="${indexable ? 'index,follow' : 'noindex,follow'}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#315f9f"><script id="breadcrumb-schema" type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumb,
  }).replaceAll('<', '\\u003c')}</script></head><body><header><div class="shell nav"><a class="brand" href="/" aria-label="WordUnscramble.eu home"><img class="brand-logo" src="/assets/wordunscramble-logo.png" alt="WordUnscramble.eu" width="260" height="48"></a><nav><a href="/">Unscrambler</a><a href="/wordle-solver/">Wordle Solver</a><a href="/crossword-solver/">Crossword Solver</a><a href="/guides/">Guides</a></nav></div></header><main class="shell"><section class="content" data-content-tier="${family}">${breadcrumbHtml}<h1>${esc(h1)}</h1><p class="content-intro">${esc(intro)}</p><div class="statline"><span class="stat">${broadMatches.length.toLocaleString('en-US')} broad matches</span><span class="stat">${commonMatches.length.toLocaleString('en-US')} common matches</span><span class="stat">Updated ${today}</span></div><h2>${esc(primaryHeading)}</h2><p>${esc(primaryText)}</p>${wordGrid(quick)}${customSections}<h2>${esc(secondaryHeading)}</h2><p>${esc(secondaryText)}</p>${wordGrid(more)}<h2>Use the right solver</h2><p>Use the Word Finder when you have available letters, the Crossword Solver when positions are fixed, and the Wordle Solver when you also need included and excluded letters.</p>${linkGrid([
    ['/word-finder/', 'Open Word Finder'],
    ['/crossword-solver/', 'Open Crossword Solver'],
    ['/wordle-solver/', 'Open Wordle Solver'],
    ['/', 'Open Word Unscrambler'],
  ])}${related.length ? `<h2>Related searches</h2>${linkGrid(related)}` : ''}${faqHtml}</section></main><footer><div class="shell"><div class="footerlinks"><a href="/guides/">Guides</a><a href="/about/">About</a><a href="/how-it-works/">How it works</a><a href="/editorial-policy/">Editorial policy</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a></div><p>Independent English word tool. Game trademarks belong to their respective owners.</p></div></footer></body></html>`;
}

function writePage(route, html) {
  const relative = route.replace(/^\/|\/$/g, '');
  write(relative ? `${relative}/index.html` : 'index.html', html);
}

function singleLetterQuality(type, length, broadCount, commonCount) {
  if (type === 'containing') {
    return broadCount >= Math.max(12, length * 2) && commonCount >= Math.max(5, Math.ceil(length / 2));
  }
  return broadCount >= Math.max(6, length) && commonCount >= Math.max(3, Math.ceil(length / 2));
}

const typeConfig = {
  starting: {
    phrase: 'Starting With',
    lower: 'starting with',
    verb: (letter) => (word) => word.startsWith(letter),
    categoryRoute: '/words-that-start-with/',
    letterRoute: (letter) => `/words-that-start-with/${letter}/`,
  },
  ending: {
    phrase: 'Ending With',
    lower: 'ending with',
    verb: (letter) => (word) => word.endsWith(letter),
    categoryRoute: '/words-that-end-with/',
    letterRoute: (letter) => `/words-that-end-with/${letter}/`,
  },
  containing: {
    phrase: 'Containing',
    lower: 'containing',
    verb: (letter) => (word) => word.includes(letter),
    categoryRoute: '/words-containing/',
    letterRoute: (letter) => `/words-containing/${letter}/`,
  },
};

function generateLengthHubs() {
  for (const length of lengths) {
    const broad = broadByLength.get(length);
    const common = commonByLength.get(length);
    const route = `/${length}-letter-words/`;
    const related = [];
    if (filterLengths.includes(length)) {
      related.push(
        [`/${length}-letter-words-starting-with-a/`, `${length} letter words starting with A`],
        [`/${length}-letter-words-ending-with-e/`, `${length} letter words ending with E`],
        [`/${length}-letter-words-containing-s/`, `${length} letter words containing S`],
      );
    }
    related.push(
      ['/words-that-start-with/', 'Browse words by starting letter'],
      ['/words-that-end-with/', 'Browse words by ending letter'],
      ['/words-containing/', 'Browse words by required letter'],
    );
    writePage(route, renderPage({
      route,
      title: `${length} Letter Words`,
      description: `Browse ${length} letter English words, common examples and fast links for starting, ending and containing-letter searches.`,
      h1: `${length} Letter Words`,
      intro: `Browse ${length}-letter words with familiar examples first. Use the focused letter pages or interactive solvers to narrow the list by beginning, ending, included letters or exact positions.`,
      broadMatches: broad,
      commonMatches: common,
      indexable: true,
      family: 'programmatic',
      breadcrumbItems: [['Word Lists', '/word-lists/']],
      related,
      faqs: [
        [`How many ${length} letter words are in this list?`, `The broad list currently contains ${broad.length.toLocaleString('en-US')} ${length}-letter entries, with ${common.length.toLocaleString('en-US')} marked as common English words.`],
        [`How do I narrow ${length} letter words?`, 'Add a known starting letter, ending letter or required letter, or use the Crossword Solver for fixed positions.'],
      ],
    }));
    addManifest(route, 'length-hub', true, broad.length, common.length, { length });
  }
}

function generateCategoryHubsAndLetterHubs() {
  for (const [type, config] of Object.entries(typeConfig)) {
    const categoryTitle = type === 'starting'
      ? 'Words That Start With'
      : type === 'ending'
        ? 'Words That End With'
        : 'Words Containing a Letter';
    const categoryIntro = type === 'starting'
      ? 'Choose a starting letter to browse English words across multiple lengths, then jump into a length-specific page when your puzzle gives you an exact word size.'
      : type === 'ending'
        ? 'Choose a final letter to browse English words across multiple lengths, then narrow by word length or use a solver for fixed positions.'
        : 'Choose a required letter to browse words that contain it anywhere, then narrow by word length or exact letter position.';
    const categoryLinks = letters.map((letter) => [config.letterRoute(letter), `${categoryTitle.replace(/a Letter$/, '')} ${letter.toUpperCase()}`]);
    writePage(config.categoryRoute, renderPage({
      route: config.categoryRoute,
      title: categoryTitle,
      description: `${categoryTitle}. Browse A-Z letter hubs, common examples and focused word-length searches.`,
      h1: categoryTitle,
      intro: categoryIntro,
      broadMatches: allBroad,
      commonMatches: allCommon,
      indexable: true,
      family: 'programmatic',
      breadcrumbItems: [['Word Lists', '/word-lists/']],
      primaryHeading: 'Choose a letter',
      primaryText: 'Open a letter hub to see common examples across lengths and links to focused 2-8 letter searches.',
      customSections: linkGrid(categoryLinks),
      secondaryHeading: 'Example words from the full list',
      related: [
        ['/word-lists/', 'All word lists'],
        ['/5-letter-words/', '5 letter words'],
        ['/word-finder/', 'Word Finder'],
      ],
      faqs: [
        [`How do I use the ${categoryTitle.toLowerCase()} pages?`, 'Pick the letter you know, then choose a word length if you have one. Use a solver when you also know exact positions or excluded letters.'],
      ],
    }));
    addManifest(config.categoryRoute, 'category-hub', true, allBroad.length, allCommon.length, { type });

    for (const letter of letters) {
      const matcher = config.verb(letter);
      const broad = allBroad.filter(matcher);
      const common = allCommon.filter(matcher);
      const route = config.letterRoute(letter);
      const indexable = broad.length >= 20 && common.length >= 8;
      const perLength = filterLengths.map((length) => {
        const b = broadByLength.get(length).filter(matcher);
        const c = commonByLength.get(length).filter(matcher);
        return { length, broad: b, common: c };
      });
      const grouped = perLength
        .filter(({ common: c }) => c.length)
        .map(({ length, common: c }) => `<h3>${length} letter words</h3>${wordGrid(sampleEven(c, 18))}`)
        .join('');
      const related = perLength
        .filter(({ length, broad: b, common: c }) => singleLetterQuality(type, length, b.length, c.length))
        .map(({ length }) => [
          `/${length}-letter-words-${type === 'starting' ? 'starting-with' : type === 'ending' ? 'ending-with' : 'containing'}-${letter}/`,
          `${length} letter words ${config.lower} ${letter.toUpperCase()}`,
        ]);
      writePage(route, renderPage({
        route,
        title: `${categoryTitle.replace(/a Letter$/, '')} ${letter.toUpperCase()}`,
        description: `Browse English words ${config.lower} ${letter.toUpperCase()}, grouped by useful word lengths with common examples first.`,
        h1: `${categoryTitle.replace(/a Letter$/, '')} ${letter.toUpperCase()}`,
        intro: `This A-Z browse page collects English words ${config.lower} ${letter.toUpperCase()} across multiple lengths. Start with common examples, then use a length-specific page or solver to narrow the result.`,
        broadMatches: broad,
        commonMatches: common,
        indexable,
        family: 'programmatic',
        breadcrumbItems: [[categoryTitle, config.categoryRoute]],
        customSections: `<h2>Common matches by word length</h2>${grouped}`,
        related: [
          ...related,
          [config.categoryRoute, `All ${categoryTitle.toLowerCase()}`],
          ['/word-finder/', 'Word Finder'],
        ],
        faqs: [
          [`How many words ${config.lower} ${letter.toUpperCase()} are listed?`, `The broad source contains ${broad.length.toLocaleString('en-US')} matches across 2-15 letters, with ${common.length.toLocaleString('en-US')} common-word matches.`],
          [`Can I filter words ${config.lower} ${letter.toUpperCase()} by length?`, 'Yes. Use the related length links on this page, or set an exact length in the Word Finder.'],
        ],
      }));
      addManifest(route, 'letter-hub', indexable, broad.length, common.length, { type, letter });
    }
  }
}

function lengthLetterRoute(type, length, letter) {
  const middle = type === 'starting' ? 'starting-with' : type === 'ending' ? 'ending-with' : 'containing';
  return `/${length}-letter-words-${middle}-${letter}/`;
}

function generateLengthLetterPages() {
  for (const length of filterLengths) {
    const broadSource = broadByLength.get(length);
    const commonSource = commonByLength.get(length);
    for (const [type, config] of Object.entries(typeConfig)) {
      for (const letter of letters) {
        const matcher = config.verb(letter);
        const broad = broadSource.filter(matcher);
        const common = commonSource.filter(matcher);
        const indexable = singleLetterQuality(type, length, broad.length, common.length);
        const route = lengthLetterRoute(type, length, letter);
        const h1 = `${length} Letter Words ${config.phrase} ${letter.toUpperCase()}`;
        writePage(route, renderPage({
          route,
          title: h1,
          description: `Find ${length} letter words ${config.lower} ${letter.toUpperCase()}, with common examples, broader matches and fast puzzle-solving links.`,
          h1,
          intro: `Use this list when you need exactly ${length} letters and know the word is ${config.lower} ${letter.toUpperCase()}. Familiar words are shown first, followed by a broader sample from the English word list.`,
          broadMatches: broad,
          commonMatches: common,
          indexable,
          family: 'programmatic',
          breadcrumbItems: [
            [`${length} Letter Words`, `/${length}-letter-words/`],
          ],
          related: [
            [config.letterRoute(letter), `All words ${config.lower} ${letter.toUpperCase()}`],
            [`/${length}-letter-words/`, `All ${length} letter words`],
            [config.categoryRoute, `Browse ${config.lower} A-Z`],
          ],
          faqs: [
            [`What are common ${length} letter words ${config.lower} ${letter.toUpperCase()}?`, common.length ? `Examples include ${sampleEven(common, 8).map((word) => word.toUpperCase()).join(', ')}.` : 'This common-word list has very few matches; use the broader Word Finder for rare vocabulary.'],
            [`How many ${length} letter matches are available?`, `There are ${broad.length.toLocaleString('en-US')} broad-list matches and ${common.length.toLocaleString('en-US')} common-word matches for this filter.`],
          ],
        }));
        addManifest(route, 'length-letter', indexable, broad.length, common.length, { type, length, letter });
      }
    }
  }
}

function generateFiveLetterStartEndPages() {
  const broadSource = broadByLength.get(5);
  const commonSource = commonByLength.get(5);
  for (const start of letters) {
    for (const end of letters) {
      if (start === end && broadSource.filter((word) => word.startsWith(start) && word.endsWith(end)).length === 0) continue;
      const matcher = (word) => word.startsWith(start) && word.endsWith(end);
      const broad = broadSource.filter(matcher);
      const common = commonSource.filter(matcher);
      if (broad.length < 8 || common.length < 3) continue;
      const route = `/5-letter-words-starting-with-${start}-ending-with-${end}/`;
      const h1 = `5 Letter Words Starting With ${start.toUpperCase()} and Ending With ${end.toUpperCase()}`;
      writePage(route, renderPage({
        route,
        title: h1,
        description: `Find 5 letter words starting with ${start.toUpperCase()} and ending with ${end.toUpperCase()}, with common answers and a broader matching list.`,
        h1,
        intro: `This page combines two strong clues: the first letter is ${start.toUpperCase()} and the final letter is ${end.toUpperCase()}. Use the common matches first, then add any known middle positions in the Crossword Solver.`,
        broadMatches: broad,
        commonMatches: common,
        indexable: true,
        family: 'programmatic',
        breadcrumbItems: [['5 Letter Words', '/5-letter-words/']],
        related: [
          [`/5-letter-words-starting-with-${start}/`, `5 letter words starting with ${start.toUpperCase()}`],
          [`/5-letter-words-ending-with-${end}/`, `5 letter words ending with ${end.toUpperCase()}`],
          ['/crossword-solver/', 'Crossword Solver'],
        ],
        faqs: [
          [`How many 5 letter words start with ${start.toUpperCase()} and end with ${end.toUpperCase()}?`, `The broad list contains ${broad.length.toLocaleString('en-US')} matches and the common list contains ${common.length.toLocaleString('en-US')}.`],
          ['How do I narrow the middle three letters?', 'Enter the pattern in the Crossword Solver and replace unknown positions with question marks.'],
        ],
      }));
      addManifest(route, 'start-end', true, broad.length, common.length, { length: 5, start, end });
    }
  }
}

const positionNames = { 1: 'second', 2: 'third', 3: 'fourth' };

function generateFiveLetterPositionPages() {
  const broadSource = broadByLength.get(5);
  const commonSource = commonByLength.get(5);
  for (const [positionText, name] of Object.entries(positionNames)) {
    const position = Number(positionText);
    for (const letter of letters) {
      const matcher = (word) => word[position] === letter;
      const broad = broadSource.filter(matcher);
      const common = commonSource.filter(matcher);
      if (broad.length < 12 || common.length < 5) continue;
      const route = `/5-letter-words-with-${letter}-as-${name}-letter/`;
      const h1 = `5 Letter Words With ${letter.toUpperCase()} as the ${titleWords(name)} Letter`;
      writePage(route, renderPage({
        route,
        title: h1,
        description: `Find 5 letter words with ${letter.toUpperCase()} as the ${name} letter, with common examples and broader matching words.`,
        h1,
        intro: `Use this position page when ${letter.toUpperCase()} is fixed as the ${name} letter in a five-letter word. Exact positions are especially useful for crosswords and Wordle-style pattern searches.`,
        broadMatches: broad,
        commonMatches: common,
        indexable: true,
        family: 'programmatic',
        breadcrumbItems: [['5 Letter Words', '/5-letter-words/']],
        related: [
          [`/5-letter-words-containing-${letter}/`, `5 letter words containing ${letter.toUpperCase()}`],
          ['/crossword-solver/', 'Crossword Solver'],
          ['/wordle-solver/', 'Wordle Solver'],
        ],
        faqs: [
          [`How many 5 letter words have ${letter.toUpperCase()} as the ${name} letter?`, `The broad list contains ${broad.length.toLocaleString('en-US')} matches, including ${common.length.toLocaleString('en-US')} common words.`],
          ['Can I add more fixed positions?', 'Yes. The Crossword Solver supports a full five-character pattern, so you can combine several confirmed positions.'],
        ],
      }));
      addManifest(route, 'position', true, broad.length, common.length, { length: 5, position: position + 1, letter });
    }
  }
}

function tokenCounts(words, selector) {
  const counts = new Map();
  for (const word of words) {
    for (const token of uniq(selector(word))) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }
  return counts;
}

function generateFiveLetterDigrams() {
  const broadSource = broadByLength.get(5);
  const commonSource = commonByLength.get(5);
  const configs = [
    {
      type: 'starting',
      phrase: 'Starting With',
      lower: 'starting with',
      selector: (word) => [word.slice(0, 2)],
      broadMin: 20,
      commonMin: 10,
      match: (word, token) => word.startsWith(token),
    },
    {
      type: 'ending',
      phrase: 'Ending With',
      lower: 'ending with',
      selector: (word) => [word.slice(-2)],
      broadMin: 20,
      commonMin: 10,
      match: (word, token) => word.endsWith(token),
    },
    {
      type: 'containing',
      phrase: 'Containing',
      lower: 'containing',
      selector: (word) => Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2)),
      broadMin: 35,
      commonMin: 16,
      match: (word, token) => word.includes(token),
    },
  ];

  for (const config of configs) {
    const broadCounts = tokenCounts(broadSource, config.selector);
    const commonCounts = tokenCounts(commonSource, config.selector);
    const tokens = [...commonCounts.keys()]
      .filter((token) => /^[a-z]{2}$/.test(token))
      .filter((token) => (commonCounts.get(token) || 0) >= config.commonMin && (broadCounts.get(token) || 0) >= config.broadMin)
      .sort();
    for (const token of tokens) {
      const broad = broadSource.filter((word) => config.match(word, token));
      const common = commonSource.filter((word) => config.match(word, token));
      const route = `/5-letter-words-${config.type === 'starting' ? 'starting-with' : config.type === 'ending' ? 'ending-with' : 'containing'}-${token}/`;
      const h1 = `5 Letter Words ${config.phrase} ${token.toUpperCase()}`;
      writePage(route, renderPage({
        route,
        title: h1,
        description: `Find 5 letter words ${config.lower} ${token.toUpperCase()}, with common examples, broader matches and practical puzzle filters.`,
        h1,
        intro: `This focused list keeps the two-letter sequence ${token.toUpperCase()} together while filtering to exactly five letters. Use it when a crossword, anagram or Wordle-style clue confirms that sequence.`,
        broadMatches: broad,
        commonMatches: common,
        indexable: true,
        family: 'programmatic',
        breadcrumbItems: [['5 Letter Words', '/5-letter-words/']],
        related: [
          ['/5-letter-words/', 'All 5 letter words'],
          [`/words-${config.type === 'starting' ? 'that-start-with' : config.type === 'ending' ? 'that-end-with' : 'containing'}/`, `Browse words ${config.lower}`],
          ['/word-finder/', 'Word Finder'],
        ],
        faqs: [
          [`How many 5 letter words are ${config.lower} ${token.toUpperCase()}?`, `The broad list contains ${broad.length.toLocaleString('en-US')} matches and ${common.length.toLocaleString('en-US')} common-word matches.`],
          ['What if the two letters are not next to each other?', 'Use Wordle Solver or Crossword Solver instead. This page only matches the exact two-letter sequence shown in the heading.'],
        ],
      }));
      addManifest(route, 'digram', true, broad.length, common.length, { length: 5, type: config.type, token });
    }
  }
}

function patchSection(file, startMarker, endMarker, html, before = '</main>') {
  let source = read(file);
  const block = `${startMarker}${html}${endMarker}`;
  const pattern = new RegExp(`${startMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  if (pattern.test(source)) source = source.replace(pattern, block);
  else source = source.replace(before, `${block}${before}`);
  write(file, source);
}

function patchHomepageAndWordLists() {
  const homeBlock = `<section class="content"><p class="eyebrow">Browse by clue</p><h2>Explore word lists by letters and length</h2><p class="content-intro">Jump straight to words that start with, end with or contain a letter, or browse the most useful word lengths.</p>${linkGrid([
    ['/words-that-start-with/', 'Words that start with...'],
    ['/words-that-end-with/', 'Words that end with...'],
    ['/words-containing/', 'Words containing...'],
    ['/4-letter-words/', '4 letter words'],
    ['/5-letter-words/', '5 letter words'],
    ['/6-letter-words/', '6 letter words'],
    ['/7-letter-words/', '7 letter words'],
  ])}</section>`;
  patchSection('index.html', '<!-- programmatic-browse:start -->', '<!-- programmatic-browse:end -->', homeBlock);

  const listBlock = `<h2>Browse by letter clue</h2><p>Use these hubs when you know where a letter belongs, then choose an exact word length for a narrower list.</p>${linkGrid([
    ['/words-that-start-with/', 'Words that start with...'],
    ['/words-that-end-with/', 'Words that end with...'],
    ['/words-containing/', 'Words containing...'],
  ])}<h2>Browse by word length</h2>${linkGrid(lengths.map((length) => [`/${length}-letter-words/`, `${length} letter words`]))}`;
  patchSection('word-lists/index.html', '<!-- programmatic-clusters:start -->', '<!-- programmatic-clusters:end -->', listBlock, '</section>');
}

function rewriteMiddlewarePolicy() {
  const file = 'functions/_middleware.js';
  let source = read(file);
  source = source.replace(
    /const lowValueListPath = [^\n]+;/,
    "const lowValueListPath = /^\\/(?:\\d+-letter-words(?:\\/[a-z-]*)?|\\d+-letter-words-(?:starting|ending|containing|with)[^/]*|words-(?:with|ending|starting|that|containing)[^/]*)(?:\\/|$)/i;"
  );
  source = source.replace(
    /\/\/ Keep clearly unfinished inventory[\s\S]*?const promotedFiveLetterPath = [^\n]+;\n/,
    "// Keep only a small legacy thin-page family out of search results.\n// The generated SEO families carry their own static robots directives.\nconst thinIndexPath = /^\\/(?:words-with-(?:q|x|z))\\/?$/i;\n"
  );
  source = source.replace(
    /if \(thinIndexPath\.test\(url\.pathname\) && !promotedFiveLetterPath\.test\(url\.pathname\)\)/,
    'if (thinIndexPath.test(url.pathname))'
  );
  write(file, source);
}

function rewriteLegacyApplyPolicy() {
  write('scripts/apply-indexing-policy.cjs', "#!/usr/bin/env node\nrequire('./apply-indexing-policy-v2.cjs');\n");
}

function rewriteIntegrityWorkflow() {
  write('.github/workflows/seo-integrity.yml', `name: SEO integrity

on:
  pull_request:
  push:
    branches: [main]
    paths:
      - '**/index.html'
      - 'sitemap*.xml'
      - 'robots.txt'
      - 'functions/**'
      - 'data/programmatic-seo-routes.json'
      - 'scripts/check-programmatic-seo.cjs'
      - '.github/workflows/seo-integrity.yml'

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Check programmatic SEO integrity
        run: node scripts/check-programmatic-seo.cjs
`);
}

function buildSitemap() {
  const coreRoutes = [
    '/',
    '/word-finder/',
    '/anagram-solver/',
    '/scrabble-word-finder/',
    '/words-with-friends-finder/',
    '/wordle-solver/',
    '/crossword-solver/',
    '/word-checker/',
    '/word-scrambler/',
    '/5-letter-anagram-solver/',
    '/6-letter-anagram-solver/',
    '/7-letter-anagram-solver/',
    '/phrase-anagram-solver/',
    '/anagram-using-these-letters/',
    '/find-an-anagram/',
    '/word-unscrambler-uk/',
    '/word-lists/',
    '/words-ending-in-ed/',
    '/words-ending-in-er/',
    '/words-ending-in-est/',
    '/words-ending-in-ing/',
    '/words-ending-in-ly/',
    '/words-ending-in-tion/',
    '/words-starting-with-dis/',
    '/words-starting-with-pre/',
    '/words-starting-with-re/',
    '/words-starting-with-un/',
    '/words-with-j/',
    '/words-with-k/',
    '/words-with-v/',
    '/about/',
    '/contact/',
    '/how-it-works/',
    '/editorial-policy/',
    '/privacy/',
    '/terms/',
  ];
  const generatedIndexable = manifest.filter((item) => item.indexable).map((item) => item.route);
  const routes = uniq([...coreRoutes, ...generatedIndexable]).sort((a, b) => a.localeCompare(b));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${origin}${route}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  write('sitemap.xml', xml);
  return routes;
}

function updateCompatibilityData() {
  const promoted = manifest
    .filter((item) => item.family === 'length-letter' && item.length === 5 && item.indexable)
    .map((item) => item.route)
    .sort();
  write('data/indexable-five-letter-routes.json', `${JSON.stringify(promoted, null, 2)}\n`);
}

function updateReadme(stats) {
  const start = '<!-- programmatic-seo:start -->';
  const end = '<!-- programmatic-seo:end -->';
  const block = `${start}
## Programmatic SEO expansion - ${today}

The site now uses a quality-gated programmatic architecture instead of mass-indexing thin pages.

- ${stats.total.toLocaleString('en-US')} generated browse/search routes
- ${stats.indexable.toLocaleString('en-US')} generated routes are indexable and included in the sitemap
- ${stats.noindex.toLocaleString('en-US')} low-volume generated routes remain browseable with \`noindex,follow\`
- 2-15 letter word hubs
- A-Z start, end and contains hubs
- 2-8 letter + single-letter filters
- 5-letter start + end combinations
- 5-letter fixed-position pages
- 5-letter two-character prefix, suffix and contains pages
- static canonicals, breadcrumbs, Open Graph metadata and internal navigation on every generated page
- programmatic list pages remain ad-free

The quality gate uses actual broad-list and common-word match counts. Low-volume combinations are not placed in the sitemap.
${end}`;

  let source = read('README.md');
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, 'i');
  if (pattern.test(source)) source = source.replace(pattern, block);
  else source = `${source.trim()}\n\n${block}\n`;
  write('README.md', source);
}

generateLengthHubs();
generateCategoryHubsAndLetterHubs();
generateLengthLetterPages();
generateFiveLetterStartEndPages();
generateFiveLetterPositionPages();
generateFiveLetterDigrams();
patchHomepageAndWordLists();
rewriteMiddlewarePolicy();
rewriteLegacyApplyPolicy();
rewriteIntegrityWorkflow();
updateCompatibilityData();

manifest.sort((a, b) => a.route.localeCompare(b.route));
write('data/programmatic-seo-routes.json', `${JSON.stringify(manifest, null, 2)}\n`);

const sitemapRoutes = buildSitemap();
const stats = {
  total: manifest.length,
  indexable: manifest.filter((item) => item.indexable).length,
  noindex: manifest.filter((item) => !item.indexable).length,
  sitemap: sitemapRoutes.length,
};
write('data/programmatic-seo-stats.json', `${JSON.stringify({ generatedAt: today, ...stats }, null, 2)}\n`);
updateReadme(stats);

console.log(`Programmatic SEO build complete: ${stats.total} generated routes, ${stats.indexable} indexable, ${stats.noindex} noindex, ${stats.sitemap} sitemap URLs.`);
