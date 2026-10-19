#!/usr/bin/env node
// Local/manual default: one commit's first-parent diff, never the whole sitemap.
// Preview: node scripts/indexnow.mjs --dry-run --base <SHA|HEAD> --head <SHA|HEAD>
// CI supplies its push/PR or completed generator event; submission is allowed only
// for current main after the exact Workers Build succeeds. No dependencies.
import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ENDPOINT = 'https://api.indexnow.org/indexnow';
const SHA = /^[a-f0-9]{40}$/;
const ZERO_SHA = '0'.repeat(40);
const GENERATOR_WORKFLOW = 'Build programmatic SEO';
const ASSET = /\.(?:m?js|css|txt|json|webmanifest|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$/i;
const delay = ms => new Promise(done => setTimeout(done, ms));
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function git(repo, ...args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
}
export function resolveCommit(repo, value) {
  if (value !== 'HEAD' && !SHA.test(value || '')) throw new Error('Commit must be HEAD or a full lowercase 40-character SHA.');
  const result = git(repo, 'rev-parse', '--verify', '--end-of-options', `${value}^{commit}`).trim();
  if (!SHA.test(result)) throw new Error('Git did not resolve a valid commit SHA.');
  return result;
}
export function firstParent(repo, sha) {
  return git(repo, 'rev-list', '--parents', '-n', '1', sha, '--').trim().split(' ')[1] || null;
}
export function snapshot(repo, sha) {
  if (!sha) return null;
  if (!SHA.test(sha)) throw new Error('Invalid snapshot SHA.');
  const files = new Set(git(repo, 'ls-tree', '-r', '-z', '--full-tree', sha).split('\0')
    .filter(line => /^100(?:644|755) blob /.test(line)).map(line => line.slice(line.indexOf('\t') + 1)));
  const cache = new Map();
  return { files, read(file) {
    if (!files.has(file)) return null;
    if (!cache.has(file)) cache.set(file, git(repo, 'cat-file', 'blob', `${sha}:${file}`));
    return cache.get(file);
  } };
}
export function changedFiles(repo, base, head) {
  if (!base) return new Set();
  return new Set(git(repo, 'diff', '--no-ext-diff', '--no-renames', '--name-only', '-z', base, head, '--').split('\0').filter(Boolean));
}
function decodeEntities(text) {
  return text.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const names = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (names[entity.toLowerCase()]) return names[entity.toLowerCase()];
    return String.fromCodePoint(parseInt(entity.slice(entity[2].toLowerCase() === 'x' ? 3 : 2, -1), entity[2].toLowerCase() === 'x' ? 16 : 10));
  });
}
function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4]);
  }
  return result;
}
function pagePath(url, origin) {
  const parsed = new URL(url);
  if (parsed.origin !== origin || parsed.search || parsed.hash || parsed.username || parsed.password || parsed.href !== url
      || !/^\/[a-zA-Z0-9_/-]*(?:\.html)?$/.test(parsed.pathname)) throw new Error(`Invalid curated URL: ${url}`);
  if (parsed.pathname.endsWith('/')) return `${parsed.pathname.slice(1)}index.html`;
  if (parsed.pathname.endsWith('.html')) return parsed.pathname.slice(1);
  throw new Error(`Curated URL must use its canonical slash or HTML path: ${url}`);
}
export function validateConfig(config) {
  if (new URL(config.origin).origin !== config.origin || !config.origin.startsWith('https://')) throw new Error('IndexNow origin must be an HTTPS origin without a trailing slash.');
  if (!/^[a-f0-9]{32}$/.test(config.key)) throw new Error('IndexNow key must be 32 hexadecimal characters.');
  if (JSON.stringify(config.sitemaps) !== JSON.stringify(['sitemap.xml', 'sitemap-guides.xml'])) throw new Error('Use both published flat sitemaps: sitemap.xml and sitemap-guides.xml.');
  if (config.deploymentCheck?.name !== 'Workers Builds: wordunscramble-eu' || config.deploymentCheck?.appSlug !== 'cloudflare-workers-and-pages') throw new Error('Unexpected deployment check identity.');
  if (config.generatorWorkflow !== GENERATOR_WORKFLOW) throw new Error('Unexpected generator workflow identity.');
  return config;
}
export function curatedUrls(tree, config) {
  const urls = new Set();
  if (!tree || !config.sitemaps.some(file => tree.files.has(file))) return { exists: false, urls };
  // Both files are independent URLSET inventories; sitemap.xml is not an index.
  for (const file of config.sitemaps) {
    const xml = tree.read(file);
    if (!xml) throw new Error(`Missing tracked sitemap: ${file}`);
    if (!/<urlset\b/i.test(xml) || /<sitemapindex\b/i.test(xml)) throw new Error(`Expected a flat URLSET sitemap: ${file}`);
    for (const match of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
      const loc = decodeEntities(match[1]);
      pagePath(loc, config.origin); urls.add(loc);
    }
  }
  return { exists: true, urls };
}
function assetPath(reference, base, tree, origin) {
  try {
    const url = new URL(reference, base);
    if (url.origin !== origin || !ASSET.test(url.pathname)) return null;
    const file = decodeURIComponent(url.pathname.slice(1));
    return tree.files.has(file) ? file : null;
  } catch { return null; }
}
function dependencies(tree, url, config) {
  const found = new Set();
  if (!tree) return found;
  const page = pagePath(url, config.origin), html = tree.read(page);
  if (html === null) return found;
  const queue = [];
  const add = file => { if (file && !found.has(file)) { found.add(file); queue.push(file); } };
  add(page);
  for (const tag of html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(?:script|link|img|source|video|audio|a)\b[^>]*>/gi)) {
    const attributes = attrs(tag[0]);
    for (const reference of [attributes.src, attributes.href, attributes.poster]) if (reference) add(assetPath(reference, url, tree, config.origin));
  }
  // Runtime-injected and variable dependencies are explicit, route-scoped config.
  for (const file of [...(config.routeAssets?.['*'] || []), ...(config.routeAssets?.[new URL(url).pathname] || [])]) if (tree.files.has(file)) add(file);
  for (let i = 0; i < queue.length; i += 1) {
    const file = queue[i];
    for (const child of config.assetDependencies?.[file] || []) if (tree.files.has(child)) add(child);
    if (!/\.(?:m?js|css)$/.test(file)) continue;
    const source = tree.read(file), base = `${config.origin}/${file}`;
    const references = /\.css$/.test(file)
      ? [...source.matchAll(/(?:url\(\s*|@import\s+)["']?([^\s'";)]+)["']?/g)].map(m => m[1])
      : [...source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']([^"']+)["']/g)].map(m => m[1]);
    // Explicit dependencies override fetch discovery for scripts with separate
    // event-bound tools. For example, Word Scrambler loads solvers.js but no data.
    // Otherwise fetch() paths are document-relative, unlike module import paths.
    if (!Object.hasOwn(config.assetDependencies || {}, file)) {
      for (const match of source.matchAll(/\b(?:fetch|loadDictionary)\(\s*["']([^"']+)["']/g)) add(assetPath(match[1], url, tree, config.origin));
    }
    for (const reference of references) add(assetPath(reference, base, tree, config.origin));
  }
  return found;
}
export function meaningfulPageChange(before, after) {
  if (before === null || after === null) return before !== after;
  function normalize(html) {
    if (!/\bdata-content-tier\s*=/.test(html)) return html;
    // Ignore only the generator's known date substrings, retaining their full
    // surrounding markup, links, schema, counts and content for comparison.
    return html
      .replace(/(<span class="stat">Updated )\d{4}-\d{2}-\d{2}(<\/span>)/g, '$1{date}$2')
      .replace(/(<p class="muted programmatic-freshness"><strong>Last updated:<\/strong> )(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}( · )/g, '$1{date}$2')
      .replace(/(<script id="programmatic-aeo-schema"[^>]*>)([\s\S]*?)(<\/script>)/g, (_, open, body, close) =>
        open + body.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}(")/g, '$1{date}$2') + close);
  }
  return normalize(before) !== normalize(after);
}
export function selectUrls({ config, before, after, changed }) {
  const current = curatedUrls(after, config);
  if (!current.exists) throw new Error('The selected commit has no configured curated sitemaps.');
  // A root commit has no genuine change baseline. Never treat the inventory as new.
  if (!before) return { entries: [], current: current.urls, note: 'No parent baseline; no inventory backfill.' };
  const previous = curatedUrls(before, config), entries = [];
  const globalChanges = (config.globalFiles || []).filter(file => changed.has(file));
  const assetChanges = [...changed].some(file => ASSET.test(file) && file !== 'indexnow.config.json' && !/^[a-f0-9]{32}\.txt$/.test(file) && !file.startsWith('scripts/'));
  for (const url of [...new Set([...current.urls, ...previous.urls])].sort()) {
    const active = current.urls.has(url), reasons = [];
    if (active && previous.exists && !previous.urls.has(url)) reasons.push('added to curated sitemap');
    if (!active) reasons.push('removed from curated sitemap');
    const page = pagePath(url, config.origin);
    const paths = assetChanges && !globalChanges.length
      ? new Set([...dependencies(before, url, config), ...dependencies(after, url, config)]) : new Set([page]);
    for (const file of paths) {
      if (changed.has(file) && (file !== page || meaningfulPageChange(before.read(file), after.read(file)))) reasons.push(`changed ${file}`);
    }
    for (const file of globalChanges) reasons.push(`shared response policy changed: ${file}`);
    if (!reasons.length) continue;
    if (active && !after.files.has(pagePath(url, config.origin))) throw new Error(`Active sitemap URL has no tracked HTML page: ${url}`);
    entries.push({ url, kind: active ? 'active' : 'removed', reasons });
  }
  if (entries.length > 10000) throw new Error('More than 10,000 changed URLs; refusing an oversized batch.');
  return { entries, current: current.urls, note: previous.exists ? '' : 'No earlier sitemap: only changed page/dependency files are eligible; no inventory backfill.' };
}

export class StaleDeployment extends Error {}
export function retryDelay(value, attempt, now = Date.now()) {
  const milliseconds = value == null ? 2000 * 2 ** attempt : /^\d+(?:\.\d+)?$/.test(value.trim())
    ? Number(value) * 1000 : Math.max(0, Date.parse(value) - now);
  if (!Number.isFinite(milliseconds)) return 2000 * 2 ** attempt;
  if (milliseconds > 30000) throw new Error(`Retry-After requires ${Math.ceil(milliseconds / 1000)} seconds; bounded retry stopped. Rerun later.`);
  return milliseconds;
}
export async function request(url, options = {}, { fetchImpl = fetch, sleep = delay, beforeAttempt = async () => {}, now = Date.now } = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await beforeAttempt();
    let response;
    try { response = await fetchImpl(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(20000) }); }
    catch (error) {
      if (attempt === 2) throw new Error(`Network request failed for ${url}: ${error.message}`);
      await sleep(retryDelay(null, attempt, now())); continue;
    }
    if (response.status !== 429 && response.status < 500) return response;
    if (attempt === 2) throw new Error(`HTTP ${response.status} after 3 attempts: ${url}`);
    const pause = retryDelay(response.headers.get('retry-after'), attempt, now());
    await response.body?.cancel();
    await sleep(pause);
  }
}
function githubApi(repo, token, network) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '') || !token) throw new Error('Submission requires GITHUB_REPOSITORY and a read-only GITHUB_TOKEN.');
  return async path => {
    const response = await request(`https://api.github.com/repos/${repo}/${path}`, { headers: {
      authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'WordUnscramble-IndexNow'
    } }, network);
    if (response.status !== 200) throw new Error(`GitHub deployment verification failed (HTTP ${response.status}).`);
    return response.json();
  };
}
export async function assertCurrentMain(api, sha) {
  const ref = await api('git/ref/heads/main');
  if (!SHA.test(ref.object?.sha || '')) throw new Error('GitHub returned an invalid main SHA.');
  if (ref.object.sha !== sha) {
    const error = new StaleDeployment(`Main advanced to ${ref.object.sha}; selected SHA ${sha} is stale.`);
    error.latestSha = ref.object.sha;
    throw error;
  }
}

function ensureCommit(repo, repository, sha) {
  if (!SHA.test(sha) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) throw new Error('Invalid repository or retarget SHA.');
  try { return resolveCommit(repo, sha); } catch { /* A newer public commit may not be in this checkout yet. */ }
  // Fetch only this exact validated SHA from the public repository. No token is
  // placed in command arguments, and checkout credentials remain unpersisted.
  git(repo, 'fetch', '--no-tags', '--no-recurse-submodules', `https://github.com/${repository}.git`, sha);
  return resolveCommit(repo, sha);
}
export async function waitForDeployment({ api, sha, check, sleep = delay, now = Date.now, timeoutMs = 600000, log = console.log }) {
  if (!SHA.test(sha)) throw new Error('Invalid deployment SHA.');
  const deadline = now() + timeoutMs;
  do {
    await assertCurrentMain(api, sha);
    const result = await api(`commits/${sha}/check-runs?check_name=${encodeURIComponent(check.name)}&filter=latest&per_page=100`);
    const matches = (result.check_runs || []).filter(run => run.head_sha === sha && run.name === check.name && run.app?.slug === check.appSlug);
    const latest = matches.sort((a, b) => b.id - a.id)[0];
    if (latest?.status === 'completed') {
      if (latest.conclusion !== 'success') throw new Error(`${check.name} did not deploy ${sha} successfully (${latest.conclusion}).`);
      await assertCurrentMain(api, sha);
      return latest;
    }
    if (now() + 15000 > deadline) break;
    log(`Waiting for ${check.name} to deploy ${sha} (15 seconds).`);
    await sleep(15000);
  } while (now() < deadline);
  throw new Error(`Timed out waiting for a successful ${check.name} check for ${sha}. No URLs submitted.`);
}
export function htmlSignals(html, url) {
  const source = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const canonicals = [], robots = [];
  for (const match of source.matchAll(/<(?:meta|link)\b[^>]*>/gi)) {
    const attributes = attrs(match[0]);
    if ((attributes.rel || '').toLowerCase().split(/\s+/).includes('canonical') && attributes.href) canonicals.push(new URL(attributes.href, url).href);
    if (/^(?:robots|bingbot|googlebot)$/i.test(attributes.name || '')) robots.push(attributes.content || '');
  }
  return { canonical: canonicals.length === 1 ? canonicals[0] : null, noindex: robots.some(value => /\b(?:noindex|none)\b/i.test(value)) };
}
export async function verifyKey(config, network) {
  const location = `${config.origin}/${config.key}.txt`;
  const response = await request(location, { headers: { 'cache-control': 'no-cache' } }, network);
  if (response.status !== 200 || !/^text\/plain(?:;|$)/i.test(response.headers.get('content-type') || '') || await response.text() !== config.key) throw new Error(`Live IndexNow key must be HTTP 200, text/plain and exactly the configured key: ${location}`);
  return location;
}
export async function verifyUrl(entry, current, config, network) {
  const response = await request(entry.url, { headers: { 'cache-control': 'no-cache' } }, network);
  if (entry.kind === 'removed' && [404, 410].includes(response.status)) return `withdrawn: HTTP ${response.status}`;
  if (entry.kind === 'removed' && [301, 308].includes(response.status)) {
    const location = response.headers.get('location');
    const target = location && new URL(location, entry.url).href;
    if (!target || target === entry.url || !current.has(target)) throw new Error(`Removed URL redirects outside the current curated routes: ${entry.url}`);
    await verifyUrl({ url: target, kind: 'active' }, current, config, network);
    return `moved: HTTP ${response.status} to ${target}`;
  }
  if (response.status !== 200) throw new Error(`Expected live HTTP 200 for ${entry.url}; received ${response.status}.`);
  const headerNoindex = /\b(?:noindex|none)\b/i.test(response.headers.get('x-robots-tag') || '');
  if (entry.kind === 'removed' && headerNoindex) return 'withdrawn: X-Robots-Tag noindex';
  if (!/^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '')) throw new Error(`Expected HTML: ${entry.url}`);
  const signals = htmlSignals(await response.text(), entry.url);
  if (entry.kind === 'removed') {
    if (signals.noindex) return 'withdrawn: HTML noindex';
    if (signals.canonical && signals.canonical !== entry.url && current.has(signals.canonical)) {
      await verifyUrl({ url: signals.canonical, kind: 'active' }, current, config, network);
      return `canonical moved to ${signals.canonical}`;
    }
    throw new Error(`Sitemap removal alone is not a deletion: ${entry.url} still returns indexable HTTP 200. No batch sent.`);
  }
  if (headerNoindex || signals.noindex) throw new Error(`Active curated URL is noindex: ${entry.url}`);
  if (signals.canonical !== entry.url) throw new Error(`Active URL must have exactly one self canonical: ${entry.url} (found ${signals.canonical}).`);
  return 'HTTP 200; self canonical; indexable';
}
export async function verifyUrls(entries, current, config, network) {
  // A real shared change can affect 1,000+ indexable lists. Keep requests bounded
  // without spending a network round trip serially on every page.
  const statuses = new Array(entries.length);
  let next = 0, failure;
  async function worker() {
    while (!failure && next < entries.length) {
      const index = next++;
      try { statuses[index] = await verifyUrl(entries[index], current, config, network); }
      catch (error) { failure ||= error; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, entries.length) }, worker));
  if (failure) throw failure;
  return statuses;
}
export async function submitBatch(config, entries, keyLocation, network) {
  if (!entries.length || entries.length > 10000) throw new Error('Refusing an empty or oversized IndexNow batch.');
  for (const entry of entries) pagePath(entry.url, config.origin);
  const response = await request(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({
    host: new URL(config.origin).host, key: config.key, keyLocation, urlList: entries.map(entry => entry.url)
  }) }, network);
  if (response.status === 200) return 'HTTP 200: URLs received by IndexNow. This does not mean indexed.';
  if (response.status === 202) return 'HTTP 202: URLs received; key validation pending. Not indexed confirmation; no retry sent.';
  throw new Error(`IndexNow rejected the batch (HTTP ${response.status}). ${({ 400: 'Invalid request format.', 403: 'Key verification failed.', 422: 'Host, key or URL mismatch.' })[response.status] || 'Check the workflow and rerun only after resolving the cause.'}`);
}

export function eventSelection(repo, env, event, args = {}) {
  const name = env.GITHUB_EVENT_NAME;
  if (name === 'workflow_run') {
    const run = event.workflow_run;
    if (run?.name !== GENERATOR_WORKFLOW || run.status !== 'completed' || run.conclusion !== 'success'
        || run.head_branch !== 'main' || !env.GITHUB_REPOSITORY || run.head_repository?.full_name !== env.GITHUB_REPOSITORY) {
      throw new Error('Refusing an untrusted, unsuccessful or non-main generator handoff.');
    }
    if (args.base || args.head) throw new Error('Generator handoff must use its event baseline and current main.');
  }
  const manual = name === 'workflow_dispatch' ? env.INDEXNOW_COMMIT_SHA?.trim() : null;
  const head = resolveCommit(repo, args.head || manual || (name === 'pull_request' ? event.pull_request?.head?.sha : name === 'push' ? event.after : env.GITHUB_SHA) || 'HEAD');
  let base;
  if (name === 'workflow_run') {
    // This is the generator INPUT commit. The GITHUB_TOKEN bot's OUTPUT push does
    // not trigger another push workflow; compare that input to the published head.
    base = resolveCommit(repo, event.workflow_run.head_sha);
    git(repo, 'merge-base', '--is-ancestor', base, head);
  } else if (args.base) base = resolveCommit(repo, args.base);
  else if (name === 'pull_request') {
    const prBase = resolveCommit(repo, event.pull_request?.base?.sha);
    base = git(repo, 'merge-base', prBase, head).trim();
    if (!SHA.test(base)) throw new Error('Cannot find the pull request merge base.');
  } else if (name === 'push' && event.before && event.before !== ZERO_SHA) base = resolveCommit(repo, event.before);
  else base = firstParent(repo, head);
  const dryRun = args.dryRun || name === 'pull_request' || env.INDEXNOW_DRY_RUN !== 'false';
  if (!dryRun && !['push', 'workflow_dispatch', 'workflow_run'].includes(name)) throw new Error('Live submission is restricted to push, trusted generator or manual GitHub Actions runs.');
  if (!dryRun && env.GITHUB_REF !== 'refs/heads/main') throw new Error('Live submission is restricted to main.');
  return { head, base, dryRun };
}
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const option = argv[i];
    if (option === '--dry-run') args.dryRun = true;
    else if (['--base', '--head'].includes(option) && argv[i + 1]) args[option.slice(2)] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${option}`);
  }
  return args;
}
export async function main({ repo = repoRoot, env = process.env, argv = process.argv.slice(2), network = {}, log = console.log } = {}) {
  const summary = ['## IndexNow'];
  try {
    const event = env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8')) : {};
    const selection = eventSelection(repo, env, event, parseArgs(argv));
    const { base, dryRun } = selection;
    let head = selection.head;
    summary.push(`Mode: **${dryRun ? 'dry run (no requests)' : 'production'}**`, `Original baseline: \`${base || 'none'}\`.`);
    for (let retargets = 0; retargets <= 3; retargets += 1) {
      const after = snapshot(repo, head);
      const configText = after.read('indexnow.config.json') || (dryRun ? readFileSync(resolve(repo, 'indexnow.config.json'), 'utf8') : null);
      if (!configText) throw new Error('Selected production commit has no IndexNow configuration.');
      const config = validateConfig(JSON.parse(configText));
      const result = selectUrls({ config, before: snapshot(repo, base), after, changed: changedFiles(repo, base, head) });
      summary.push(`Commit: \`${head}\`; ${result.entries.length} changed URLs selected. ${result.note}`);
      log(`IndexNow ${dryRun ? 'dry run' : 'production'}: ${base || '(no baseline)'} -> ${head}; ${result.entries.length} selected URLs.`);
      for (const entry of result.entries) {
        log(`${entry.kind}: ${entry.url} — ${entry.reasons.join('; ')}`);
        summary.push(`- ${entry.kind}: ${entry.url} — ${entry.reasons.join('; ')}`);
      }
      if (!result.entries.length) { summary.push('No changed curated URLs. No inventory backfill or IndexNow submission.'); return { ...result, head, base }; }
      if (dryRun) { summary.push('No live validation or IndexNow submission attempted.'); return { ...result, head, base }; }
      if (after.read(`${config.key}.txt`) !== config.key) throw new Error('Selected commit must contain the exact configured public key file.');
      const api = githubApi(env.GITHUB_REPOSITORY, env.GITHUB_TOKEN, network);
      try {
        const deployed = await waitForDeployment({ api, sha: head, check: config.deploymentCheck, sleep: network.sleep, now: network.now, log });
        summary.push(`${config.deploymentCheck.name} check ${deployed.id} succeeded for this exact commit.`);
        const keyLocation = await verifyKey(config, network);
        summary.push('Live public key verified.');
        const statuses = await verifyUrls(result.entries, result.current, config, network);
        for (const [index, entry] of result.entries.entries()) {
          const status = statuses[index];
          log(`${entry.url}: ${status}`); summary.push(`- Verified ${entry.url}: ${status}`);
        }
        // Check freshness immediately before every POST attempt, including retries.
        const status = await submitBatch(config, result.entries, keyLocation, { ...network, beforeAttempt: () => assertCurrentMain(api, head) });
        log(status); summary.push(`**${status}**`);
        return { ...result, head, base, status };
      } catch (error) {
        // A newer deployment can become live during key/page validation (for
        // example, turning an active URL into a 410). Recheck main before treating
        // that live-state mismatch as an error in the old commit's own deployment.
        if (!(error instanceof StaleDeployment) && ['push', 'workflow_run'].includes(env.GITHUB_EVENT_NAME)) {
          try { await assertCurrentMain(api, head); }
          catch (freshnessError) { if (freshnessError instanceof StaleDeployment) error = freshnessError; }
        }
        if (!(error instanceof StaleDeployment) || !['push', 'workflow_run'].includes(env.GITHUB_EVENT_NAME)) throw error;
        if (retargets === 3) throw new Error(`Main kept advancing; stopped after 3 retargets. Rerun this workflow to preserve baseline ${base}.`);
        // Each push keeps its original baseline and survives later pushes. A
        // documentation-only follow-up cannot discard an earlier page update.
        head = ensureCommit(repo, env.GITHUB_REPOSITORY, error.latestSha);
        if (env.GITHUB_EVENT_NAME === 'workflow_run') git(repo, 'merge-base', '--is-ancestor', base, head);
        const message = `Main advanced: retargeting to ${head}, preserving baseline ${base}. Rechecking changed URLs and exact deployment.`;
        log(message); summary.push(message);
      }
    }
  } catch (error) {
    summary.push(`**Failed:** ${error.message}`);
    throw error;
  } finally {
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary.join('\n\n')}\n`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(`IndexNow: ${error.message}`); process.exitCode = 1; });
}
