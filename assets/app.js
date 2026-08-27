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
async function define(word, button) {
  const card = button.closest(".word-card"),
    old = card.querySelector(".definition");
  if (old) {
    old.remove();
    return;
  }
  const box = document.createElement("div");
  box.className = "definition";
  box.textContent = "Looking up definition…";
  card.append(box);
  try {
    const r = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    );
    if (!r.ok) throw Error();
    const d = (await r.json())?.[0]?.meanings?.[0];
    box.innerHTML = d?.definitions?.[0]?.definition
      ? `<strong>${d.partOfSpeech || "Definition"}:</strong> ${d.definitions[0].definition}`
      : `No short definition found. <a target="_blank" rel="noreferrer" href="https://en.wiktionary.org/wiki/${word}">Wiktionary →</a>`;
  } catch {
    box.innerHTML = `Definition unavailable. <a target="_blank" rel="noreferrer" href="https://en.wiktionary.org/wiki/${word}">Wiktionary →</a>`;
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
