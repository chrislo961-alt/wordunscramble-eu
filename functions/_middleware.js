function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

const primaryNav = '<nav><a href="/">Unscrambler</a><a href="/wordle-solver/">Wordle Solver</a><a href="/crossword-solver/">Crossword Solver</a><a href="/guides/">Guides</a></nav>';

const lowValueListPath = /^\/(?:\d+-letter-words(?:\/[a-z-]*)?|\d+-letter-words-(?:starting|ending|containing|with)[^/]*|words-(?:with|ending|starting|that|containing)[^/]*)(?:\/|$)/i;

// Keep only a small legacy thin-page family out of search results.
// The generated SEO families carry their own static robots directives.
const thinIndexPath = /^\/(?:words-with-(?:q|x|z))\/?$/i;

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.protocol !== 'https:' || url.hostname === 'www.wordunscramble.eu') {
    url.protocol = 'https:';
    url.hostname = 'wordunscramble.eu';
    return Response.redirect(url.toString(), 301);
  }

  // Retire duplicate keyword variants now that the homepage is the canonical
  // word-unscrambler experience. Preserve query parameters such as shared racks.
  if (/^\/(?:word-unscrambler|free-word-unscrambler)\/?$/i.test(url.pathname)) {
    url.pathname = '/';
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();

  // Force one consistent brand treatment everywhere, including older pages
  // that still contain the legacy text/WU header markup.
  html = html.replace(
    /<a\s+class=["']brand["']\s+href=["']\/["'][^>]*>[\s\S]*?<\/a>/gi,
    '<a class="brand" href="/" aria-label="WordUnscramble.eu home"><img class="brand-logo" src="/assets/wordunscramble-logo.png" alt="WordUnscramble.eu" width="260" height="48"></a>',
  );

  html = html.replace(/(<header[^>]*>[\s\S]*?<div\s+class=["']shell nav["'][^>]*>[\s\S]*?)<nav>[\s\S]*?<\/nav>/i, `$1${primaryNav}`);

  // Programmatic reference lists remain useful for browsing, but advertising is
  // deliberately limited to substantial tools, guides and trust pages.
  if (lowValueListPath.test(url.pathname)) {
    html = html
      .replace(/\s*<meta\s+name=["']google-adsense-account["'][^>]*>/gi, '')
      .replace(/\s*<script[^>]*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/gi, '');
  }

  if (thinIndexPath.test(url.pathname)) {
    html = html.replace(/\s*<meta\s+name=["']robots["'][^>]*>/gi, '');
    html = html.replace(/<\/head>/i, '<meta name="robots" content="noindex,follow">\n</head>');
  }

  if (url.pathname === '/' && !html.includes('Featured solving guides')) {
    const guideSection = `<section class="content"><p class="eyebrow">Original help</p><h2>Featured solving guides</h2><p class="content-intro">The solver gives you candidates; these guides explain how to narrow them intelligently and when each word-list mode is useful.</p><div class="links"><a href="/guides/how-to-unscramble-words/">How to Unscramble Words Efficiently</a><a href="/guides/anagram-strategies/">Anagram Strategies That Actually Help</a><a href="/guides/wordle-pattern-strategy/">A Better Wordle Pattern Strategy</a><a href="/guides/crossword-pattern-strategy/">Using Letter Patterns in Crosswords</a><a href="/guides/choosing-word-list/">Broad, Common or ENABLE?</a><a href="/editorial-policy/">Editorial & Content Quality Policy</a></div></section>`;
    html = html.replace(/<\/main>/i, `${guideSection}</main>`);
  }

  html = html.replace(
    /<div\s+class=["']footerlinks["'][^>]*>[\s\S]*?<\/div>/i,
    '<div class="footerlinks"><a href="/guides/">Guides</a><a href="/about/">About</a><a href="/how-it-works/">How it works</a><a href="/editorial-policy/">Editorial policy</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a></div>',
  );

  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || 'WordUnscramble.eu';
  let description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i)?.[1]?.trim() || '';
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["'][^>]*>/i)?.[1]?.trim() || url.toString();

  if (description.length < 70) {
    const cleanTitle = title.replace(/\s*\|\s*WordUnscramble\.eu\s*$/i, '').trim();
    description = `${cleanTitle}. Browse matching English words, use fast letter filters and continue with the free Word Finder and Anagram Solver.`;
    html = html.replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["'][^>]*>/i, `<meta name="description" content="${escapeHtml(description)}">`);
  }

  const shared = [];
  if (!/ui-polish\.css/i.test(html)) shared.push('<link rel="stylesheet" href="/assets/ui-polish.css?v=20260904-1">');
  if (!/rel=["']icon["']/i.test(html)) shared.push('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
  if (!/rel=["']apple-touch-icon["']/i.test(html)) shared.push('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
  if (!/manifest\.webmanifest/i.test(html)) shared.push('<link rel="manifest" href="/manifest.webmanifest">');
  if (!/name=["']theme-color["']/i.test(html)) shared.push('<meta name="theme-color" content="#315f9f">');
  if (!/property=["']og:type["']/i.test(html)) shared.push('<meta property="og:type" content="website">');
  if (!/property=["']og:site_name["']/i.test(html)) shared.push('<meta property="og:site_name" content="WordUnscramble.eu">');
  if (!/property=["']og:title["']/i.test(html)) shared.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
  if (!/property=["']og:description["']/i.test(html)) shared.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
  if (!/property=["']og:url["']/i.test(html)) shared.push(`<meta property="og:url" content="${escapeHtml(canonical)}">`);
  if (!/property=["']og:image["']/i.test(html)) shared.push('<meta property="og:image" content="https://wordunscramble.eu/social-card.png">');
  if (!/property=["']og:image:alt["']/i.test(html)) shared.push('<meta property="og:image:alt" content="WordUnscramble.eu — letters in, words out">');
  if (!/name=["']twitter:card["']/i.test(html)) shared.push('<meta name="twitter:card" content="summary_large_image">');
  if (!/name=["']twitter:image["']/i.test(html)) shared.push('<meta name="twitter:image" content="https://wordunscramble.eu/social-card.png">');
  if (!/application\/ld\+json/i.test(html)) {
    shared.push(`<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      url: canonical,
      description,
      isPartOf: {
        '@type': 'WebSite',
        name: 'WordUnscramble.eu',
        url: 'https://wordunscramble.eu/'
      }
    }).replaceAll('<', '\\u003c')}</script>`);
  }

  if (shared.length) html = html.replace(/<\/head>/i, `${shared.join('')}\n</head>`);

  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=UTF-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}