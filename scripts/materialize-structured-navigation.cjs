#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const origin = 'https://wordunscramble.eu';
const sitemapFiles = ['sitemap.xml', 'sitemap-guides.xml'];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, contents) {
  fs.writeFileSync(path.join(root, file), contents);
}

function routeToFile(route) {
  return route === '/'
    ? 'index.html'
    : path.join(route.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
}

function cleanText(value) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function schemaScript(id, data) {
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  return `<script id="${id}" type="application/ld+json">${json}</script>`;
}

const routes = sitemapFiles.flatMap((file) =>
  [...read(file).matchAll(/<loc>https:\/\/wordunscramble\.eu([^<]*)<\/loc>/g)]
    .map((match) => match[1] || '/'),
);

for (const route of routes) {
  const file = routeToFile(route);
  let html = read(file);

  html = html
    .replace(/\s*<script id="site-identity-schema"[^>]*>[\s\S]*?<\/script>/i, '')
    .replace(/\s*<script id="breadcrumb-schema"[^>]*>[\s\S]*?<\/script>/i, '');

  if (route === '/') {
    const siteIdentity = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'WordUnscramble.eu',
      alternateName: 'wordunscramble.eu',
      url: `${origin}/`,
    };
    html = html.replace(/<\/head>/i, `    ${schemaScript('site-identity-schema', siteIdentity)}\n  </head>`);
    write(file, html);
    continue;
  }

  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!h1) throw new Error(`Missing H1 on ${route}`);
  const currentName = cleanText(h1[1]);
  const isGuide = route.startsWith('/guides/');
  const crumbs = [
    { name: 'Home', route: '/' },
    ...(isGuide ? [{ name: 'Guides', route: '/guides/' }] : []),
    { name: currentName, route },
  ];
  const visible = `<nav class="breadcrumb" aria-label="Breadcrumb">${crumbs
    .map((crumb, index) => {
      const separator = index ? ' <span aria-hidden="true">/</span> ' : '';
      if (index === crumbs.length - 1) {
        return `${separator}<span aria-current="page">${escapeHtml(crumb.name)}</span>`;
      }
      return `${separator}<a href="${crumb.route}">${escapeHtml(crumb.name)}</a>`;
    })
    .join('')}</nav>`;

  if (/<(?:div|nav)\s+class=["']breadcrumb["'][^>]*>[\s\S]*?<\/(?:div|nav)>/i.test(html)) {
    html = html.replace(
      /<(?:div|nav)\s+class=["']breadcrumb["'][^>]*>[\s\S]*?<\/(?:div|nav)>/i,
      visible,
    );
  } else {
    html = html.replace(/<h1\b/i, `${visible}<h1`);
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.route}`,
    })),
  };
  html = html.replace(/<\/head>/i, `${schemaScript('breadcrumb-schema', breadcrumbSchema)}</head>`);
  write(file, html);
}

console.log(`Structured navigation updated on ${routes.length} curated pages.`);
