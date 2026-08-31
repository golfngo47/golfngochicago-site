// One-off migration script: extracts structured per-city data from the
// existing hand-authored HTML pages into a raw JSON dump for review before
// hand-assembly into src/_data/cities.json. Not part of the Eleventy build.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');

const CITIES = [
  'aurora','barrington','buffalo-grove','burr-ridge','clarendon-hills','downers-grove',
  'elmhurst','evanston','frankfort','glen-ellyn','glencoe','glenview','highland-park',
  'hinsdale','kenilworth','la-grange','lake-forest','lake-zurich','naperville','northbrook',
  'oak-brook','oak-park','orland-park','plainfield','schaumburg','tinley-park',
  'western-springs','wheaton','wilmette','winnetka','yorkville'
];

function text($, el) {
  return $(el).clone().children('svg').remove().end().text().replace(/\s+/g, ' ').trim();
}

function extractOne(slug) {
  const file = path.join(ROOT, `golf-simulator-rental-${slug}.html`);
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || '';

  // Intro paragraphs: the <p> tags inside the first "intro" container specifically
  // (not any .section-body anywhere in the doc — that class is reused by other
  // sections like Nearby Communities on the Tier-1 skin). Every known skin has
  // exactly 2 real intro paragraphs.
  const introContainer = $('[class*="intro-grid"], [class*="intro"]').first();
  let introParagraphs = [];
  introContainer.find('p').each((_, el) => {
    const t = text($, el);
    if (t.length > 60) introParagraphs.push(t);
  });
  introParagraphs = [...new Set(introParagraphs)].slice(0, 2);
  // Wix-stub skin uses .content-body p instead — capture as raw source material
  // for rewriting, not final copy.
  if (introParagraphs.length === 0) {
    $('.content-body p').each((_, el) => introParagraphs.push(text($, el)));
  }

  // Event cards — title/desc are class-named on the Tier-1 skin, plain h3/p on others.
  // Use exact class-token selectors (`.event-card`) not substring attr matches, so we
  // don't also match nested `.event-card-body`/`.event-card-icon` wrapper divs.
  const eventCards = [];
  $('.event-card').each((_, el) => {
    const $el = $(el);
    const icon = text($, $el.find('.event-card-icon, .event-icon').first());
    let title = text($, $el.find('.event-card-title, .event-title').first());
    let desc = text($, $el.find('.event-card-desc, .event-desc').first());
    if (!title) title = text($, $el.find('h3, h4, strong').first());
    if (!desc) desc = text($, $el.find('p').first());
    if (title) eventCards.push({ icon, title, desc });
  });

  // FAQ
  const faq = [];
  $('.faq-item').each((_, el) => {
    const $el = $(el);
    const q = text($, $el.find('.faq-q').first());
    const a = text($, $el.find('.faq-a').first());
    if (q) faq.push({ q, a });
  });

  // Nearby pills — only ones that link to another location page
  const nearbyTowns = [];
  const nearbyRaw = [];
  $('a.pill, a.nearby-pill').each((_, el) => {
    const href = $(el).attr('href') || '';
    const label = text($, el);
    const m = href.match(/golf-simulator-rental-([a-z-]+)/);
    if (m && m[1] !== slug) {
      nearbyTowns.push(m[1]);
      nearbyRaw.push(label);
    }
  });

  // Hero / event image references
  const heroImg = $('[class*="hero"] img').first().attr('src') || null;
  const eventImg = $('[class*="intro-img"] img, [class*="content"] img').first().attr('src') || null;

  // Wix stub detector
  const isWixStub = /wixstatic\.com/.test(html);

  return {
    slug, title, metaDescription, ogDescription, canonical,
    introParagraphs, eventCards, faq,
    nearbyTowns: [...new Set(nearbyTowns)],
    nearbyRaw,
    heroImg, eventImg,
    isWixStub,
    counts: { introParagraphs: introParagraphs.length, eventCards: eventCards.length, faq: faq.length, nearbyTowns: nearbyTowns.length }
  };
}

const out = {};
for (const slug of CITIES) {
  try {
    out[slug] = extractOne(slug);
  } catch (e) {
    out[slug] = { slug, error: String(e) };
  }
}

const outPath = path.join(ROOT, 'scripts', 'raw-extracted-cities.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('Wrote', outPath);

// Print a quick completeness report to stdout
for (const slug of CITIES) {
  const c = out[slug].counts;
  if (out[slug].error) {
    console.log(slug.padEnd(18), 'ERROR', out[slug].error);
  } else {
    console.log(slug.padEnd(18), JSON.stringify(c));
  }
}
