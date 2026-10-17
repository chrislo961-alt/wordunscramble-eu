const fs = require('node:fs');
const path = require('node:path');

const startMarker = '<!-- word-list-navigation:start -->';
const endMarker = '<!-- word-list-navigation:end -->';
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const phrase = { starting: 'Starting with', ending: 'Ending with', containing: 'Containing' };
const routeForLetter = (type, length, letter) => `/${length}-letter-words-${type === 'starting' ? 'starting-with' : type === 'ending' ? 'ending-with' : 'containing'}-${letter}/`;

function addWordListNavigation(root, manifest) {
  const indexable = manifest.filter((item) => item.indexable);
  const routes = new Set(indexable.map((item) => item.route));
  const groups = new Map();

  function add(parent, heading, route, label) {
    if (!routes.has(parent)) throw new Error(`Navigation parent is not indexable: ${parent}`);
    if (!routes.has(route)) throw new Error(`Navigation destination is not indexable: ${route}`);
    if (!groups.has(parent)) groups.set(parent, new Map());
    if (!groups.get(parent).has(heading)) groups.get(parent).set(heading, new Map());
    groups.get(parent).get(heading).set(route, label);
  }

  for (const item of indexable) {
    if (item.family === 'length-letter') {
      add(`/${item.length}-letter-words/`, `${phrase[item.type]} a letter`, item.route, `${phrase[item.type]} ${item.letter.toUpperCase()}`);
    } else if (item.family === 'start-end') {
      const label = `Starts ${item.start.toUpperCase()}, ends ${item.end.toUpperCase()}`;
      add(routeForLetter('starting', 5, item.start), 'Also know the last letter?', item.route, label);
      add(routeForLetter('ending', 5, item.end), 'Also know the first letter?', item.route, label);
    } else if (item.family === 'position') {
      add(routeForLetter('containing', 5, item.letter), 'Know where this letter belongs?', item.route, `${item.letter.toUpperCase()} in position ${item.position}`);
    } else if (item.family === 'digram') {
      const letter = item.type === 'ending' ? item.token.at(-1) : item.token[0];
      add(routeForLetter(item.type, 5, letter), `${phrase[item.type]} two letters together`, item.route, `${phrase[item.type]} ${item.token.toUpperCase()}`);
    }
  }

  let updated = 0;
  for (const [route, sections] of groups) {
    const lengthHub = /^\/\d+-letter-words\/$/.test(route);
    const intro = lengthHub
      ? 'Choose the letter clue you know. Each link opens a matching list with common-use examples and options for narrowing the answer.'
      : 'Add a second clue to this five-letter list: a two-letter sequence, a known ending or a fixed position.';
    const heading = lengthHub ? 'Browse by a known letter' : 'Narrow this five-letter list';
    const details = [...sections].map(([label, entries]) => {
      const links = [...entries].sort((a, b) => a[1].localeCompare(b[1])).map(([href, text]) => `<a href="${escape(href)}">${escape(text)}</a>`).join('');
      return `<details><summary>${escape(label)} (${entries.size})</summary><div class="links">${links}</div></details>`;
    }).join('');
    const block = `${startMarker}<div class="word-list-navigation"><h2>${heading}</h2><p>${intro}</p>${details}</div>${endMarker}`;
    const file = path.join(root, route.slice(1), 'index.html');
    const before = fs.readFileSync(file, 'utf8');
    const after = before.includes(startMarker)
      ? before.replace(new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`), block)
      : before.replace('<h2>Use the right solver</h2>', `${block}<h2>Use the right solver</h2>`);
    if (!after.includes(block)) throw new Error(`Could not insert navigation: ${route}`);
    if (after !== before) {
      fs.writeFileSync(file, after);
      updated++;
    }
  }
  console.log(`Word-list clue navigation: ${groups.size} parent pages, ${updated} updated.`);
}

module.exports = { addWordListNavigation };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  addWordListNavigation(root, JSON.parse(fs.readFileSync(path.join(root, 'data/programmatic-seo-routes.json'), 'utf8')));
}
