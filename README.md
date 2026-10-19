# WordUnscramble.eu V1.1 - Traffic Engine

Major upgrade from the 528-word test build.

- 194,152 alphabetic English entries (2-15 letters) derived from the Wordnik open-source wordlist
- Wordnik MIT license included in /licenses/WORDNIK_LICENSE.txt
- word data split by length and loaded lazily for faster mobile searches
- wildcard, starts with, ends with, contains and exact length
- length, A-Z and point sorting
- expanded browse/SEO architecture with useful word lists
- rebuilt sitemap
- no AI/API/server required

SEO note: do not mass-generate thin pages. Add new indexable patterns only when they provide a distinct useful browse/search experience and Search Console shows demand.

## Internal link discovery

Length hubs link to indexable letter lists. Five-letter lists then offer related two-letter sequences, first-and-last-letter combinations and fixed-position clues. The generator maintains this navigation; noindex inventory is excluded from these links.

Run `node scripts/check-link-discovery.cjs` to verify that every submitted sitemap page can be reached from the homepage through links on other submitted pages. This check also runs as part of the programmatic SEO audit, so a valid sitemap cannot hide disconnected pages.

Before launch: replace the Contact placeholder with a real public contact method.


## V1.2 AdSense readiness changes
- Removed visible "Future AdSense placement" boxes from public pages.
- Expanded About, Privacy Policy, Terms and Contact pages.
- Added a transparent "How Our Word Tools Work" / editorial methodology page.
- Added disclosure language for Google advertising cookies.
- Added European consent/CMP readiness language.
- Added trust links throughout the footer.
- Kept `ads.txt` free of any guessed publisher ID.

### Before submitting to AdSense
1. Configure `contact@wordunscramble.eu` as a real mailbox or forwarding alias.
2. Confirm the custom domain is live over HTTPS and all navigation links work.
3. Submit the sitemap to Google Search Console.
4. Use the exact AdSense site-verification/ad code supplied by your own AdSense account.
5. When ads are enabled for EEA/UK/Switzerland users, configure a Google-certified CMP (Google's own Privacy & messaging option can be used where appropriate).
6. Replace `ads.txt` with the exact authorized-seller line provided in AdSense once Google gives you the publisher ID.
7. Do not crowd the tool with ads; keep advertising clearly separated from search controls and publisher content.

AdSense approval is never guaranteed. This package is designed to remove obvious readiness issues and align the site more closely with Google's published site-quality and privacy expectations.


## V1.3 AdSense verification
- Added the AdSense account meta tag to every HTML page.
- Added the AdSense loader script to every HTML page.
- Added the exact Google ads.txt seller line for pub-9212084765206199.
- Removed any visible future-ad placeholders that may have remained.

### After deployment
1. Open https://wordunscramble.eu/ and confirm the page still works.
2. Open https://wordunscramble.eu/ads.txt and confirm the Google seller line is visible.
3. In AdSense, tick “I have placed the code” and click Verify.
4. Then request review.
5. Configure Google's certified CMP / European regulations message in AdSense before personalized ads are served to EEA/UK/Switzerland users.

This package can verify ownership and improve review readiness, but AdSense approval itself is decided by Google and cannot be guaranteed.


## SEO Batch 1
Added 78 useful 5-letter pattern landing pages (starting, ending, containing A-Z), internal navigation, and an updated sitemap. AdSense verification remains intact.


## SEO Batch 2
Added focused anagram/unscrambler landing pages based on early Search Console query signals, plus internal links and sitemap entries.

## Structured navigation
- Added a preferred `WebSite` identity to the homepage for Google site-name discovery.
- Added visible, accessible breadcrumbs and matching `BreadcrumbList` data to every curated inner page.
- Extended the SEO integrity check to validate all JSON-LD and breadcrumb destinations.

## Curated five-letter content pilot
- Promoted eight high-utility starting, ending and containing-letter pages from the noindex inventory.
- Added common-word quick answers, useful pattern groups, solving guidance and page-specific FAQs.
- Kept the remaining programmatic family noindexed and all list pages free of advertising code.

<!-- programmatic-seo:start -->
## Programmatic SEO expansion - 2026-10-17

The site now uses a quality-gated programmatic architecture instead of mass-indexing thin pages.

- 1,258 generated browse/search routes
- 1,161 generated routes are indexable and included in the sitemap
- 97 low-volume generated routes remain browseable with `noindex,follow`
- 2-15 letter word hubs
- A-Z start, end and contains hubs
- 2-8 letter + single-letter filters
- 5-letter start + end combinations
- 5-letter fixed-position pages
- 5-letter two-character prefix, suffix and contains pages
- static canonicals, breadcrumbs, Open Graph metadata and internal navigation on every generated page
- programmatic list pages remain ad-free

The quality gate uses actual broad-list and common-word match counts. Low-volume combinations are not placed in the sitemap.
<!-- programmatic-seo:end -->

## IndexNow change notifications

The **IndexNow changed URLs** workflow notifies participating search engines when published URLs are added, meaningfully updated, moved or withdrawn. It uses the union of the two independent URLSET inventories, `sitemap.xml` and `sitemap-guides.xml`. The generated noindex inventory stays excluded. Installing the integration never submits the unchanged sitemap inventory.

The public verification file is `/90d8c1acc34bb7900bf9f9f776398a46.txt`. It contains exactly the key in `indexnow.config.json`, without a trailing newline. This is a public ownership-verification file; no IndexNow secret is required.

### When it runs

- **Main pushes:** compare the push's original before/after commits. README, workflow and sitemap-date-only changes send nothing.
- **Pull requests:** compare the real PR base/head commits and print a dry run. No network requests or notifications are made.
- **Generated publications:** a successful **Build programmatic SEO** run on main triggers a separately validated `workflow_run` handoff. Its input SHA remains the baseline; generated output and any newer main changes are checked against that baseline. This covers the builder's `GITHUB_TOKEN` commit, which does not trigger an ordinary push workflow. Failed, non-main and foreign-repository handoffs are rejected. A successful no-op build sends nothing.
- **Manual dispatch:** open **Actions → IndexNow changed URLs → Run workflow**. Dry run is the default. Optionally provide a full lowercase commit SHA; the default range is only that commit's first-parent diff. Disable dry run only to notify the current published main commit. There is no scheduled inventory resubmission.

For generated pages, changing only the generator's exact `Updated` span date, `programmatic-freshness` date or `programmatic-aeo-schema` modification date does not count as a content update. Surrounding content, word counts, words, FAQs, links and schema values remain part of the comparison.

### Deployment and URL checks

Live submission requires the exact selected SHA's successful **Workers Builds: wordunscramble-eu** check from `cloudflare-workers-and-pages`, followed by validation of the public key and the selected live URLs. Active URLs must return HTML with HTTP 200, exactly one self-canonical and no noindex directive. Withdrawn URLs must return 404/410, explicit noindex, or a verified permanent/canonical move to another current sitemap route. Removing a URL from a sitemap alone is not treated as proof of deletion.

Each push and generator run retains its own original baseline. If main advances before notification, that run recomputes its changes against the new main SHA and repeats deployment and live checks. This prevents a later documentation-only commit from losing an earlier content update. After three retargets it fails clearly; rerun the same failed workflow to retain its baseline. Independent runs can occasionally notify an overlapping genuinely changed URL.

Changed pages and referenced assets are eligible. `indexnow.config.json` records variable dictionary chunks, the definition API, middleware-injected assets and route-specific solver dependencies. Keep these mappings aligned with runtime changes. Changes to generator input data alone do not imply that static generated HTML has already changed; the completed publication is checked separately. Live checks use at most six requests concurrently.

The workflow uses read-only `contents` and `checks` permissions, logs the selected URLs and live status, and writes a GitHub step summary. It sends one JSON batch to the [official IndexNow endpoint](https://www.indexnow.org/documentation). **HTTP 200 means received; HTTP 202 means received with key validation pending. Neither confirms indexing, and 202 is not retried.** Temporary failures receive at most three attempts, respecting `Retry-After`; long requested waits stop with a rerun instruction.

### Local verification

```sh
node --test scripts/indexnow.test.mjs
node scripts/indexnow.mjs --dry-run
node scripts/indexnow.mjs --dry-run --base FULL_BASE_SHA --head FULL_HEAD_SHA
```

Only `HEAD` or a full lowercase 40-character SHA is accepted as a commit argument. Local execution defaults to a dry run; the production notification path is restricted to validated GitHub Actions events on main.
