#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const fail = (message) => { console.error("FAIL", message); process.exitCode = 1; };
const pass = (message) => console.log("PASS", message);

const app = read("assets/app.js");
const phrase = read("phrase-anagram-solver/index.html");
const home = read("index.html");
const wordFinder = read("word-finder/index.html");
const anagram = read("anagram-solver/index.html");
const nine = read("9-letter-words/index.html");
const redirects = read("_redirects");

if (/data-ignore-spaces/.test(phrase) && /dataset\.ignoreSpaces/.test(app)) pass("phrase spaces are intentionally ignored");
else fail("phrase-space handling is missing");

if (/maxlength="20"/.test(phrase) && /Math\.min\(raw\.length, 15\)/.test(app)) pass("phrase input supports 20 letters while result words remain capped at available 15-letter data");
else fail("phrase input/result length contract is inconsistent");

if (/Maximum \$\{inputLimit\} letters/.test(app)) pass("input length errors follow each tool's configured maxlength");
else fail("input length feedback is not driven by configured maxlength");

for (const [label, html, canonical] of [
  ["homepage", home, "https://wordunscramble.eu/"],
  ["word finder", wordFinder, "https://wordunscramble.eu/word-finder/"],
  ["anagram solver", anagram, "https://wordunscramble.eu/anagram-solver/"],
  ["phrase solver", phrase, "https://wordunscramble.eu/phrase-anagram-solver/"],
  ["9-letter page", nine, "https://wordunscramble.eu/9-letter-words/"],
]) {
  if (html.includes(`rel="canonical" href="${canonical}"`)) pass(`${label} canonical is correct`);
  else fail(`${label} canonical mismatch`);
}

if (/\/word-unscrambler\/? \/ 301/.test(redirects) || redirects.includes("/word-unscrambler/ / 301")) pass("legacy word-unscrambler URL redirects to homepage");
else fail("legacy word-unscrambler redirect is missing");

if (/<meta name="robots" content="noindex,follow">/.test(read("word-unscrambler/index.html"))) pass("legacy duplicate remains noindex");
else fail("legacy duplicate noindex is missing");

if (/9 Letter Words &amp; Word Unscrambler|9 Letter Words & Word Unscrambler/.test(nine)) pass("9-letter intent wording is present");
else fail("9-letter intent wording is missing");

if (process.exitCode) process.exit(process.exitCode);
console.log("Live solver QA checks passed.");
