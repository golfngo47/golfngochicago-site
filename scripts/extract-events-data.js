// One-off migration script: extracts structured data from the 7 event-type
// pages into src/_data/events.json. Not part of the Eleventy build.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');

const EVENTS = [
  { slug: 'corporate-events', file: 'golf-simulator-corporate-events-chicago.html', status: 'live' },
  { slug: 'birthday-party', file: 'golf-simulator-birthday-party-chicago.html', status: 'live' },
  { slug: 'graduation', file: 'golf-simulator-graduation-chicago.html', status: 'live' },
  { slug: 'charity-fundraiser', file: 'golf-simulator-charity-fundraiser-chicago.html', status: 'live' },
  { slug: 'private-party', file: 'golf-simulator-private-party-chicago.html', status: 'live' },
  { slug: 'bachelor-party', file: 'golf-simulator-bachelor-party-chicago.html', status: 'live' },
  { slug: 'wedding', file: 'golf-simulator-wedding-chicago.html', status: 'draft' }
];

function text($, el) {
  return $(el).clone().children('svg').remove().end().text().replace(/\s+/g, ' ').trim();
}

function extractOne({ slug, file, status }) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';

  const whyHeading = text($, $('.why-body').closest('section').find('.section-heading').first());
  const whyBody = [];
  $('.why-body p').each((_, el) => whyBody.push(text($, el)));
  const infoItems = [];
  $('.info-item').each((_, el) => {
    const $el = $(el);
    infoItems.push({
      title: text($, $el.find('.info-text strong').first()),
      desc: text($, $el.find('.info-text span').first())
    });
  });

  const useCases = [];
  $('.use-case-card').each((_, el) => {
    const $el = $(el);
    useCases.push({
      icon: text($, $el.find('.use-case-icon').first()),
      title: text($, $el.find('.use-case-title').first()),
      desc: text($, $el.find('.use-case-desc').first())
    });
  });

  const perks = [];
  $('.perk-card').each((_, el) => {
    const $el = $(el);
    perks.push({
      title: text($, $el.find('.perk-title').first()),
      desc: text($, $el.find('.perk-desc').first())
    });
  });

  const packages = [];
  $('.pkg-card').each((_, el) => {
    const $el = $(el);
    const features = [];
    $el.find('.pkg-features li').each((_, li) => features.push(text($, li)));
    packages.push({
      featured: $el.hasClass('featured'),
      tier: text($, $el.find('.pkg-tier').first()),
      name: text($, $el.find('.pkg-name').first()),
      duration: text($, $el.find('.pkg-duration').first()),
      desc: text($, $el.find('.pkg-desc').first()),
      features
    });
  });

  const faq = [];
  $('.faq-item').each((_, el) => {
    const $el = $(el);
    const q = text($, $el.find('.faq-q').first());
    const a = text($, $el.find('.faq-a').first());
    if (q) faq.push({ q, a });
  });

  const heroH1 = text($, $('h1').first());
  const heroSub = text($, $('.hero-sub, .page-hero-sub').first());

  return {
    slug, status, title, metaDescription, ogDescription,
    heroH1, heroSub, whyHeading, whyBody, infoItems,
    useCases, perks, packages, faq
  };
}

const out = EVENTS.map(extractOne);
fs.writeFileSync(path.join(ROOT, 'scripts', 'raw-extracted-events.json'), JSON.stringify(out, null, 2));
console.log('Wrote scripts/raw-extracted-events.json');
for (const e of out) {
  console.log(e.slug.padEnd(20), JSON.stringify({
    whyBody: e.whyBody.length, infoItems: e.infoItems.length, useCases: e.useCases.length,
    perks: e.perks.length, packages: e.packages.length, faq: e.faq.length
  }));
}
