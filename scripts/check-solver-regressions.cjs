#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");

function makeElement(value = "") {
  return {
    value,
    innerHTML: "",
    textContent: "",
    disabled: false,
    dataset: {},
    maxLength: -1,
    classList: { add() {}, remove() {} },
    addEventListener() {},
    focus() {},
    scrollIntoView() {},
    closest() { return null; },
    querySelector() { return null; },
  };
}

const els = {
  letters: makeElement(""),
  starts: makeElement(""),
  ends: makeElement(""),
  contains: makeElement(""),
  length: makeElement(""),
  sort: makeElement("length"),
  dictionary: makeElement("broad"),
  count: makeElement(""),
  results: makeElement(""),
  go: makeElement("FIND WORDS"),
  "result-summary": makeElement(""),
  clear: makeElement(""),
  shuffle: makeElement(""),
  "share-search": makeElement(""),
};

els.letters.maxLength = 15;

const document = {
  getElementById(id) { return els[id] || null; },
  querySelectorAll() { return []; },
  createElement() { return makeElement(""); },
};

const context = {
  console,
  document,
  location: { href: "https://wordunscramble.eu/", pathname: "/", search: "" },
  history: { replaceState() {} },
  navigator: { clipboard: { async writeText() {} } },
  matchMedia: () => ({ matches: true }),
  setTimeout,
  clearTimeout,
  URL,
  URLSearchParams,
  AbortController,
  fetch: async (url) => {
    if (typeof url !== "string" || !url.startsWith("/data/")) {
      return { ok: false, status: 404, async text() { return ""; }, async json() { return {}; } };
    }
    const file = path.join(root, url.slice(1));
    if (!fs.existsSync(file)) {
      return { ok: false, status: 404, async text() { return ""; } };
    }
    const body = fs.readFileSync(file, "utf8");
    return { ok: true, status: 200, async text() { return body; } };
  },
};

vm.createContext(context);
vm.runInContext(appSource, context, { filename: "assets/app.js" });

if (typeof context.run !== "function") {
  throw new Error("Solver run() was not exposed by the evaluated app script.");
}

function reset({ phrase = false } = {}) {
  els.letters.value = "";
  els.letters.dataset = phrase ? { ignoreSpaces: "true" } : {};
  els.letters.maxLength = phrase ? 20 : 15;
  els.starts.value = "";
  els.ends.value = "";
  els.contains.value = "";
  els.length.value = "";
  els.sort.value = "length";
  els.dictionary.value = "broad";
  els.count.textContent = "";
  els.results.innerHTML = "";
  els.go.disabled = false;
  els.go.textContent = "FIND WORDS";
}

function words() {
  return [...els.results.innerHTML.matchAll(/class="word"[^>]*>\s*<span>([^<]+)<\/span>/g)].map((m) => m[1]);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log("PASS", message);
}

async function solve(input, options = {}) {
  reset({ phrase: options.phrase });
  els.letters.value = input;
  if (options.length != null) els.length.value = String(options.length);
  if (options.starts) els.starts.value = options.starts;
  if (options.ends) els.ends.value = options.ends;
  if (options.contains) els.contains.value = options.contains;
  if (options.sort) els.sort.value = options.sort;
  if (options.dictionary) els.dictionary.value = options.dictionary;
  await context.run();
  return words();
}

(async () => {
  let out = await solve("stare", { dictionary: "broad" });
  assert(out.includes("stare"), "STARE returns STARE as a valid result");

  out = await solve("listen", { dictionary: "broad", length: 6 });
  assert(out.includes("listen"), "LISTEN exact-length search includes LISTEN");
  assert(out.every((word) => word.length === 6), "exact-length filter returns only requested length");

  out = await solve("ca?", { dictionary: "broad", length: 3 });
  assert(out.length > 0, "wildcard input returns candidates");
  assert(out.some((word) => /^ca.|^c.a|^.ca/.test(word)), "wildcard candidates use supplied C and A letters");

  out = await solve("stare", { dictionary: "broad", starts: "s" });
  assert(out.length > 0 && out.every((word) => word.startsWith("s")), "starts-with filter is enforced");

  out = await solve("stare", { dictionary: "broad", ends: "e" });
  assert(out.length > 0 && out.every((word) => word.endsWith("e")), "ends-with filter is enforced");

  out = await solve("stare", { dictionary: "broad", contains: "ar" });
  assert(out.length > 0 && out.every((word) => word.includes("ar")), "contains filter is enforced");

  out = await solve("stare", { dictionary: "common" });
  const commonCount = out.length;
  out = await solve("stare", { dictionary: "broad" });
  assert(out.length >= commonCount, "Broad English is at least as inclusive as Common English");

  out = await solve("stare", { dictionary: "enable" });
  assert(out.length > 0, "ENABLE dictionary mode returns results");

  out = await solve("stare", { dictionary: "broad", sort: "az" });
  const alpha = [...out].sort((a, b) => a.localeCompare(b));
  assert(out.join("|") === alpha.join("|"), "A-Z sort orders results alphabetically");

  out = await solve("stare", { dictionary: "broad", sort: "length" });
  assert(out.every((word, i) => i === 0 || out[i - 1].length >= word.length), "length sort orders longest words first");

  out = await solve("conversationletters", { phrase: true, dictionary: "broad", length: 2 });
  assert(els.letters.value === "conversationletters", "phrase mode accepts more than 15 input letters");
  assert(out.length > 0, "long phrase input still returns supported result lengths");

  out = await solve("listen silent", { phrase: true, dictionary: "broad", length: 6 });
  assert(els.letters.value === "listensilent", "phrase mode ignores spaces instead of converting them to wildcards");
  assert(out.length > 0, "phrase mode with spaces returns candidates");

  await solve("a", { dictionary: "broad" });
  assert(/Enter at least 2 letters/.test(els.results.innerHTML), "single-letter input shows validation feedback");

  await solve("abcdefghijklmnop", { dictionary: "broad" });
  assert(els.count.textContent === "Maximum 15 letters", "standard solver enforces its 15-letter input limit");

  assert(els.go.disabled === false, "search button is re-enabled after solver runs");

  console.log("Solver regression suite passed.");
})().catch((error) => {
  console.error("FAIL", error.message);
  process.exit(1);
});
