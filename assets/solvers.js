const byId = (id) => document.getElementById(id);
const cache = {};
let commonCache;

async function words(length) {
  if (cache[length]) return cache[length];
  const response = await fetch(`/data/w${length}.txt`);
  if (!response.ok) throw Error('Word data could not load.');
  return (cache[length] = (await response.text()).trim().split(/\s+/).filter(Boolean));
}

async function commonWords() {
  if (commonCache) return commonCache;
  const response = await fetch('/data/common.txt');
  if (!response.ok) throw Error('Common-word data could not load.');
  return (commonCache = new Set((await response.text()).trim().split(/\s+/).filter(Boolean)));
}

function setStatus(message) {
  if (byId('solver-count')) byId('solver-count').textContent = message;
}

function currentDictionary() {
  return byId('solver-dictionary')?.value || 'common';
}

async function prepare(list) {
  const common = await commonWords();
  const dictionary = currentDictionary();
  const filtered = dictionary === 'common' ? list.filter((word) => common.has(word)) : [...list];
  filtered.sort(
    (a, b) => Number(common.has(b)) - Number(common.has(a)) || a.localeCompare(b),
  );
  return { list: filtered, common, dictionary };
}

function render(prepared, message) {
  const target = byId('solver-results');
  if (!target) return;
  const { list, common, dictionary } = prepared;
  setStatus(`${list.length.toLocaleString()} ${message}`);
  if (!list.length) {
    target.innerHTML = '<p class="muted">No matching words found. Try removing one restriction or switching to the broad word list.</p>';
    return;
  }

  const visible = list.slice(0, 250);
  target.innerHTML = `<div class="wordgrid">${visible
    .map((word) => {
      const isCommon = common.has(word);
      return `<article class="word-card"><button class="word" data-word="${word}" title="Copy ${word}"><span>${word}</span><small>${isCommon ? 'Common-use match' : 'Broad-list match'} · click to copy</small></button>${dictionary === 'broad' && !isCommon ? '<em class="word-type">Extended</em>' : ''}</article>`;
    })
    .join('')}</div>${list.length > visible.length ? `<p class="muted">Showing the first ${visible.length.toLocaleString()} matches. Add another clue to narrow the result.</p>` : ''}`;

  target.querySelectorAll('.word').forEach((button) => {
    button.onclick = async () => {
      try {
        await navigator.clipboard?.writeText(button.dataset.word);
        button.classList.add('copied');
        const note = button.querySelector('small');
        const original = note?.textContent;
        if (note) note.textContent = 'Copied';
        setTimeout(() => {
          button.classList.remove('copied');
          if (note && original) note.textContent = original;
        }, 700);
      } catch {
        setStatus('Copy is unavailable in this browser.');
      }
    };
  });
}

function parseMisplaced(value) {
  const rules = [];
  for (const match of String(value || '').toLowerCase().matchAll(/([a-z])\s*([1-5])/g)) {
    rules.push({ letter: match[1], index: Number(match[2]) - 1 });
  }
  return rules;
}

async function runWordle() {
  const rawPattern = byId('pattern')?.value.toLowerCase().replace(/[^a-z?.]/g, '') || '';
  const includes = byId('includes')?.value.toLowerCase().replace(/[^a-z]/g, '') || '';
  const excludes = byId('excludes')?.value.toLowerCase().replace(/[^a-z]/g, '') || '';
  const misplaced = parseMisplaced(byId('misplaced')?.value);
  const hasClue = rawPattern.replace(/[?.]/g, '').length || includes || excludes || misplaced.length;
  if (!hasClue) {
    setStatus('Add at least one clue to start.');
    byId('solver-results').innerHTML = '<p class="muted">Try a known position, an included letter, an excluded letter or a yellow-position rule.</p>';
    return;
  }

  const pattern = rawPattern.padEnd(5, '?').slice(0, 5);
  const required = new Set([...includes, ...misplaced.map((rule) => rule.letter)]);
  let list = await words(5);
  list = list.filter(
    (word) =>
      [...pattern].every((char, index) => char === '?' || char === '.' || word[index] === char) &&
      [...required].every((char) => word.includes(char)) &&
      ![...excludes].some((char) => word.includes(char)) &&
      misplaced.every((rule) => word[rule.index] !== rule.letter),
  );
  render(await prepare(list), 'possible 5-letter words');
}

async function runCrossword() {
  const pattern = byId('crossword-pattern')?.value.toLowerCase().replace(/[^a-z?.]/g, '') || '';
  const excludes = byId('crossword-excludes')?.value.toLowerCase().replace(/[^a-z]/g, '') || '';
  if (pattern.length < 2 || pattern.length > 15) {
    setStatus('Enter a pattern between 2 and 15 letters.');
    return;
  }
  let list = await words(pattern.length);
  list = list.filter(
    (word) =>
      [...pattern].every((char, index) => char === '?' || char === '.' || word[index] === char) &&
      ![...excludes].some((char) => word.includes(char)),
  );
  render(await prepare(list), 'matching words');
}

async function safeRun(fn) {
  try {
    setStatus('Searching…');
    await fn();
  } catch (error) {
    setStatus(error?.message || 'The search could not be completed.');
    if (byId('solver-results')) byId('solver-results').innerHTML = '<p class="muted">Please try again.</p>';
  }
}

byId('wordle-go')?.addEventListener('click', () => safeRun(runWordle));
byId('crossword-go')?.addEventListener('click', () => safeRun(runCrossword));

['pattern', 'includes', 'excludes', 'misplaced'].forEach((id) =>
  byId(id)?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') safeRun(runWordle);
  }),
);
['crossword-pattern', 'crossword-excludes'].forEach((id) =>
  byId(id)?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') safeRun(runCrossword);
  }),
);
byId('solver-dictionary')?.addEventListener('change', () => {
  if (byId('wordle-go') && (byId('pattern')?.value || byId('includes')?.value || byId('excludes')?.value || byId('misplaced')?.value)) safeRun(runWordle);
  if (byId('crossword-go') && byId('crossword-pattern')?.value) safeRun(runCrossword);
});

byId('wordle-example')?.addEventListener('click', () => {
  byId('pattern').value = '?r??e';
  byId('includes').value = 'a';
  byId('excludes').value = 'stol';
  byId('misplaced').value = 'a1';
  safeRun(runWordle);
});
byId('crossword-example')?.addEventListener('click', () => {
  byId('crossword-pattern').value = '?r?ne';
  byId('crossword-excludes').value = '';
  safeRun(runCrossword);
});

byId('check-go')?.addEventListener('click', async () => {
  try {
    const word = byId('check-word').value.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length < 2 || word.length > 15) return;
    const valid = (await words(word.length)).includes(word);
    setStatus(valid ? `${word.toUpperCase()} appears in the broad English word list.` : `${word.toUpperCase()} was not found in the broad English word list.`);
    byId('solver-results').innerHTML = '<p class="notice">This checks WordUnscramble.eu’s open English list, not an official tournament dictionary.</p>';
  } catch (error) {
    setStatus(error?.message || 'The word could not be checked.');
  }
});

byId('scramble-go')?.addEventListener('click', () => {
  const word = byId('scramble-word').value.trim();
  if (!word) return;
  let result = word;
  for (let attempts = 0; attempts < 8 && result.toLowerCase() === word.toLowerCase(); attempts++) {
    result = [...word].sort(() => Math.random() - 0.5).join('');
  }
  setStatus('Your scrambled word');
  byId('solver-results').innerHTML = `<p class="letters">${result}</p><button id="copy-scramble">Copy puzzle</button>`;
  byId('copy-scramble').onclick = () => navigator.clipboard?.writeText(result);
});
