const $ = (id) => document.getElementById(id),
  CACHE = {},
  POINTS = {
    a: 1,
    b: 3,
    c: 3,
    d: 2,
    e: 1,
    f: 4,
    g: 2,
    h: 4,
    i: 1,
    j: 8,
    k: 5,
    l: 1,
    m: 3,
    n: 1,
    o: 1,
    p: 3,
    q: 10,
    r: 1,
    s: 1,
    t: 1,
    u: 1,
    v: 4,
    w: 4,
    x: 8,
    y: 4,
    z: 10,
  };
let COMMON, ENABLE;
const DEFINITION_CACHE = new Map();
function counts(s) {
  const m = {};
  for (const c of s) m[c] = (m[c] || 0) + 1;
  return m;
}
function build(word, letters) {
  const pool = counts(letters.replace(/[?*]/g, ""));
  let wild = (letters.match(/[?*]/g) || []).length,
    blanks = [];
  for (const [c, n] of Object.entries(counts(word)))
    for (let i = pool[c] || 0; i < n; i++) {
      if (!wild) return null;
      blanks.push(c);
      wild--;
    }
  return blanks;
}
function score(word, blank = []) {
  const b = counts(blank.join(""));
  return [...word].reduce(
    (n, c) => (b[c] ? (b[c]--, n) : n + (POINTS[c] || 0)),
    0,
  );
}
async function loadLength(n) {
  if (CACHE[n]) return CACHE[n];
  const r = await fetch(`/data/w${n}.txt`);
  if (!r.ok) throw Error("Word data could not load.");
  return (CACHE[n] = (await r.text()).trim().split(/\s+/).filter(Boolean));
}
async function loadCommon() {
  if (COMMON) return COMMON;
  const r = await fetch("/data/common.txt");
  if (!r.ok) throw Error("Common-word data could not load.");
  return (COMMON = new Set((await r.text()).trim().split(/\s+/)));
}
async function loadEnable() {
  if (ENABLE) return ENABLE;
  const r = await fetch("/data/enable.txt");
  if (!r.ok) throw Error("ENABLE word data could not load.");
  return (ENABLE = new Set((await r.text()).trim().split(/\s+/)));
}
function status(s) {
  if ($("count")) $("count").textContent = s;
}
function state() {
  return Object.fromEntries(
    [
      "letters",
      "starts",
      "ends",
      "contains",
      "length",
      "sort",
      "dictionary",
    ].map((id) => [id, $(id)?.value || ""]),
  );
}
function saveUrl() {
  const u = new URL(location.href);
  for (const [k, v] of Object.entries(state()))
    v ? u.searchParams.set(k, v) : u.searchParams.delete(k);
  history.replaceState(null, "", u);
}
function wiktionaryUrl(word) {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`;
}
function escapeText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
async function fetchJson(url, timeout = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}
function parseDatamuse(items, word) {
  if (!Array.isArray(items)) return null;
  const exact = items.find(
    (item) => String(item?.word || "").toLowerCase() === word.toLowerCase(),
  );
  const raw = exact?.defs?.find(Boolean);
  if (!raw) return null;
  const tab = raw.indexOf("\t"),
    code = tab >= 0 ? raw.slice(0, tab) : "",
    definition = (tab >= 0 ? raw.slice(tab + 1) : raw).trim(),
    parts = {
      n: "noun",
      v: "verb",
      adj: "adjective",
      adv: "adverb",
      u: "definition",
    };
  if (!definition) return null;
  return {
    partOfSpeech: parts[code] || code || "Definition",
    definition,
    source: "Datamuse",
  };
}
function parseFreeDictionary(entries) {
  const entry = Array.isArray(entries) ? entries[0] : null,
    meanings = Array.isArray(entry?.meanings) ? entry.meanings : [],
    meaning = meanings.find(
      (item) =>
        Array.isArray(item?.definitions) &&
        item.definitions.some((definition) => definition?.definition),
    ),
    definition = meaning?.definitions?.find(
      (item) => item?.definition,
    )?.definition;
  if (!definition) return null;
  return {
    partOfSpeech: meaning?.partOfSpeech || "Definition",
    definition,
    source: "Free Dictionary API",
  };
}
async function lookupDefinition(word) {
  if (DEFINITION_CACHE.has(word)) return DEFINITION_CACHE.get(word);

  const attempts = [
    async () => {
      const data = await fetchJson(
        `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=8`,
      );
      const parsed = parseDatamuse(data, word);
      if (!parsed) throw Error("No Datamuse definition");
      return parsed;
    },
    async () => {
      const data = await fetchJson(
        `/api/definition?word=${encodeURIComponent(word)}`,
      );
      if (!data?.found || !data?.definition)
        throw Error("No local API definition");
      return {
        partOfSpeech: data.partOfSpeech || "Definition",
        definition: data.definition,
        source: "WordUnscramble.eu",
      };
    },
    async () => {
      const data = await fetchJson(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      );
      const parsed = parseFreeDictionary(data);
      if (!parsed) throw Error("No Free Dictionary definition");
      return parsed;
    },
  ];

  try {
    const result = await Promise.any(attempts.map((attempt) => attempt()));
    DEFINITION_CACHE.set(word, result);
    return result;
  } catch {
    DEFINITION_CACHE.set(word, null);
    return null;
  }
}
async function define(word, button) {
  const card = button.closest(".word-card"),
    old = card.querySelector(".definition");
  if (old) {
    old.remove();
    return;
  }

  const box = document.createElement("div");
  box.className = "definition";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  box.textContent = "Looking up definition…";
  card.append(box);
  button.disabled = true;

  try {
    const data = await lookupDefinition(word);
    if (data?.definition) {
      box.innerHTML = `<strong>${escapeText(data.partOfSpeech || "Definition")}:</strong> ${escapeText(data.definition)}`;
    } else {
      box.innerHTML = `No inline definition found. <a target="_blank" rel="noreferrer" href="${wiktionaryUrl(word)}">Wiktionary →</a>`;
    }
  } catch {
    box.innerHTML = `No inline definition found. <a target="_blank" rel="noreferrer" href="${wiktionaryUrl(word)}">Wiktionary →</a>`;
  } finally {
    button.disabled = false;
  }
}
async function run({ focusResults = false } = {}) {
  const raw = ($("letters")?.value || "")
    .toLowerCase()
    .replace(/\s/g, "?")
    .replace(/[^a-z?*]/g, "");
  if (raw.length < 2) {
    $("results").innerHTML = '<p class="muted">Enter at least 2 letters.</p>';
    return;
  }
  if (raw.length > 15) {
    status("Maximum 15 letters");
    return;
  }
  $("letters").value = raw;
  $("go").disabled = true;
  $("go").textContent = "SEARCHING…";
  try {
    const exact = +$("length").value || 0,
      max = raw.length,
      lens = exact ? [exact] : Array.from({ length: max - 1 }, (_, i) => i + 2),
      sets = await Promise.all(lens.filter((n) => n <= max).map(loadLength));
    let out = sets
      .flat()
      .map((word) => ({ word, blanks: build(word, raw) }))
      .filter((x) => x.blanks);
    const starts = $("starts").value.toLowerCase(),
      ends = $("ends").value.toLowerCase(),
      contains = $("contains").value.toLowerCase();
    if (starts) out = out.filter((x) => x.word.startsWith(starts));
    if (ends) out = out.filter((x) => x.word.endsWith(ends));
    if (contains) out = out.filter((x) => x.word.includes(contains));
    const dictionary = $("dictionary")?.value || "common";
    const common = await loadCommon();
    if (dictionary === "common") {
      out = out.filter((x) => common.has(x.word));
    }
    if (dictionary === "enable") {
      const enable = await loadEnable();
      out = out.filter((x) => enable.has(x.word));
    }
    out.forEach((x) => (x.isCommon = common.has(x.word)));
    const sort = $("sort").value,
      preferCommon = (a, b) => Number(b.isCommon) - Number(a.isCommon);
    out.sort(
      sort === "az"
        ? (a, b) => preferCommon(a, b) || a.word.localeCompare(b.word)
        : sort === "score"
          ? (a, b) =>
              score(b.word, b.blanks) - score(a.word, a.blanks) ||
              preferCommon(a, b) ||
              b.word.length - a.word.length ||
              a.word.localeCompare(b.word)
          : (a, b) =>
              b.word.length - a.word.length ||
              preferCommon(a, b) ||
              a.word.localeCompare(b.word),
    );
    status(
      `${out.length.toLocaleString()} word${out.length === 1 ? "" : "s"} found`,
    );
    const groups = {};
    for (const x of out) (groups[x.word.length] ??= []).push(x);
    const card = (x) =>
      `<article class="word-card"><button class="word" data-word="${x.word}" title="Copy ${x.word}"><span>${x.word}</span><small>${score(x.word, x.blanks)} pts${x.blanks.length ? " · blank adjusted" : ""}</small></button><button class="define" data-word="${x.word}" aria-label="Show meaning of ${x.word}">Meaning</button>${dictionary === "broad" && !x.isCommon ? '<em class="word-type">Extended</em>' : ""}</article>`;
    const top = out.slice(0, 8);
    $("results").innerHTML =
      (top.length
        ? `<section class="top-results"><div class="result-heading"><div><p class="eyebrow">Quick answer</p><h2>Top matches</h2></div><span>${top.length} shown</span></div><div class="wordgrid">${top.map(card).join("")}</div></section>`
        : "") + Object.keys(groups)
        .sort((a, b) => b - a)
        .map(
          (n) =>
            `<section class="group"><h2>${n}-letter words <span>${groups[n].length}</span></h2><div class="wordgrid">${groups[n].map(card).join("")}</div></section>`,
        )
        .join("") ||
      '<p class="muted">No matching words found. Try fewer filters.</p>';
    document.querySelectorAll(".word").forEach(
      (el) =>
        (el.onclick = async () => {
          try {
            await navigator.clipboard.writeText(el.dataset.word);
            el.classList.add("copied");
            setTimeout(() => el.classList.remove("copied"), 650);
          } catch {
            status("Copy is unavailable");
          }
        }),
    );
    document
      .querySelectorAll(".define")
      .forEach((el) => (el.onclick = () => define(el.dataset.word, el)));
    saveUrl();
    if (focusResults) {
      $("result-summary").focus({ preventScroll: true });
      $("result-summary").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }
  } catch (e) {
    $("results").innerHTML = `<p class="muted">${e.message}</p>`;
  } finally {
    $("go").disabled = false;
    $("go").textContent = "FIND WORDS";
  }
}
async function share() {
  saveUrl();
  try {
    navigator.share
      ? await navigator.share({ title: "Word search", url: location.href })
      : (await navigator.clipboard.writeText(location.href),
        status("Search link copied"));
  } catch {
    status("Sharing was cancelled");
  }
}
function clearAll() {
  ["letters", "starts", "ends", "contains"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
  $("length").value = "";
  $("results").innerHTML = "";
  status("Enter letters to start");
  history.replaceState(null, "", location.pathname);
}
$("go")?.addEventListener("click", () => run({ focusResults: true }));
$("letters")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") run({ focusResults: true });
});
["starts", "ends", "contains", "length", "sort", "dictionary"].forEach((id) =>
  $(id)?.addEventListener("change", () => $("letters").value && run()),
);
$("clear")?.addEventListener("click", clearAll);
$("shuffle")?.addEventListener("click", () => {
  $("letters").value = [...$("letters").value]
    .sort(() => Math.random() - 0.5)
    .join("");
});
$("share-search")?.addEventListener("click", share);
document.querySelectorAll("[data-example]").forEach(
  (b) =>
    (b.onclick = () => {
      $("letters").value = b.dataset.example;
      run({ focusResults: true });
    }),
);
const p = new URLSearchParams(location.search);
for (const id of [
  "letters",
  "starts",
  "ends",
  "contains",
  "length",
  "sort",
  "dictionary",
])
  if (p.get(id) && $(id)) $(id).value = p.get(id);
if (p.get("letters") && $("letters")) run();
