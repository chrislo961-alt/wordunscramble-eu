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
## Programmatic SEO expansion - 2026-09-04

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
