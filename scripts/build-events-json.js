const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'raw-extracted-events.json'), 'utf8'));

const NAMES = {
  'corporate-events': 'Corporate Events',
  'birthday-party': 'Birthday Parties',
  'graduation': 'Graduations',
  'charity-fundraiser': 'Charity & Fundraisers',
  'private-party': 'Private Parties',
  'bachelor-party': 'Bachelor Parties',
  'wedding': 'Weddings'
};

const events = raw.map(e => ({
  slug: e.slug,
  name: NAMES[e.slug],
  status: e.status,
  metaTitle: e.title,
  metaDescription: e.metaDescription,
  ogDescription: e.ogDescription || e.metaDescription,
  heroH1: e.heroH1,
  heroSub: e.heroSub,
  whyHeading: e.whyHeading,
  whyBody: e.whyBody,
  infoItems: e.infoItems,
  useCases: e.useCases,
  perks: e.perks,
  packages: e.packages,
  faq: e.faq
}));

const outDir = path.join(ROOT, 'src', '_data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'events.json'), JSON.stringify(events, null, 2));
console.log(`Wrote src/_data/events.json with ${events.length} events`);
