// One-off migration script: for standalone (non-data-driven) pages, strips the
// nav/mobile-nav/footer/analytics markup that's now handled by the shared
// base.njk layout + partials, and writes the remaining body content as an
// .njk source file with front matter. Byte-accurate via cheerio rather than
// hand-retyping large page bodies.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const ROOT = path.resolve(__dirname, '..');

const PAGES = [
  { src: 'how-it-works.html', out: 'src/how-it-works.njk', permalink: 'how-it-works.html' },
  { src: 'what-we-offer.html', out: 'src/what-we-offer.njk', permalink: 'what-we-offer.html' },
  { src: 'event-list.html', out: 'src/event-list.njk', permalink: 'event-list.html' },
  { src: 'index.html', out: 'src/index.njk', permalink: 'index.html' },
  { src: 'blog.html', out: 'src/blog.njk', permalink: 'blog.html' },
  { src: 'blog/7-ways-to-make-your-next-event-unforgettable-with-a-golf-simulator.html', out: 'src/blog/7-ways-to-make-your-next-event-unforgettable-with-a-golf-simulator.njk', permalink: 'blog/7-ways-to-make-your-next-event-unforgettable-with-a-golf-simulator.html' },
  { src: 'blog/a-beginners-guide-to-indoor-golf-technology.html', out: 'src/blog/a-beginners-guide-to-indoor-golf-technology.njk', permalink: 'blog/a-beginners-guide-to-indoor-golf-technology.html' },
  { src: 'blog/how-to-choose-the-right-indoor-golf-experience.html', out: 'src/blog/how-to-choose-the-right-indoor-golf-experience.njk', permalink: 'blog/how-to-choose-the-right-indoor-golf-experience.html' },
  { src: 'author/golfngochicago.html', out: 'src/author/golfngochicago.njk', permalink: 'author/golfngochicago.html' }
];

function isAnalyticsScript($, el) {
  const $el = $(el);
  const src = $el.attr('src') || '';
  const body = $el.html() || '';
  if (/googletagmanager\.com\/gtag/.test(src)) return true;
  if (/gtag\(/.test(body) && /dataLayer/.test(body)) return true;
  if (/googletagmanager\.com\/gtm\.js/.test(body)) return true;
  if (/connect\.facebook\.net/.test(body) || /fbq\(/.test(body)) return true;
  return false;
}

for (const { src, out, permalink } of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, src), 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';

  // Capture any JSON-LD that lives in <head> (LocalBusiness/FAQPage schema)
  // BEFORE we start removing things, since it'd otherwise be silently
  // dropped — schema position in the document doesn't matter for SEO, so we
  // re-inject it into the body just below the front matter.
  const headSchema = [];
  $('head script[type="application/ld+json"]').each((_, el) => headSchema.push($(el).html()));

  // Remove chrome now owned by the shared layout/partials
  $('nav#navbar').remove();
  $('.mobile-nav').remove();
  $('footer').remove();
  $('noscript').each((_, el) => {
    const t = $(el).html() || '';
    if (/facebook\.com\/tr/.test(t) || /googletagmanager\.com\/ns\.html/.test(t)) $(el).remove();
  });
  $('script').each((_, el) => { if (isAnalyticsScript($, el)) $(el).remove(); });
  // Remove the nav scroll/hamburger/faq-toggle/reveal script — now lives in mobile-nav.njk.
  // Heuristic: any inline <script> mentioning "hamburger" AND "mobileNav" is the shared nav script.
  $('script').each((_, el) => {
    const t = $(el).html() || '';
    if (/hamburger/.test(t) && /mobileNav/.test(t) && !$(el).attr('src')) $(el).remove();
  });

  const body = $('body').html().trim();

  const frontMatter = [
    '---',
    `permalink: "${permalink}"`,
    'layout: layouts/base.njk',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `metaDescription: "${metaDescription.replace(/"/g, '\\"')}"`,
    `ogDescription: "${(ogDescription || metaDescription).replace(/"/g, '\\"')}"`,
    `canonicalPath: "/${permalink}"`,
    'areaName: "Chicago"',
    // Explicit, not extracted: fixes the one blog post that was accidentally
    // shipped with noindex,nofollow on the live site (AUDIT.md Tier 1).
    'robotsContent: "index, follow"',
    '---'
  ].join('\n');

  const schemaHtml = headSchema.map(s => `<script type="application/ld+json">${s}</script>`).join('\n');

  fs.mkdirSync(path.dirname(path.join(ROOT, out)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, out), frontMatter + '\n' + schemaHtml + '\n' + body + '\n');
  console.log('Wrote', out, `(${body.length} chars body, ${headSchema.length} head schema block(s) preserved)`);
}
