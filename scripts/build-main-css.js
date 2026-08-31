// Extracts the inline <style> blocks from the richest existing design (Kenilworth
// for the location-page/base design system, index.html for homepage-only
// components, corporate-events for event-page-only components) and combines
// them into one deduplicated src/css/main.css. Byte-accurate extraction via
// regex rather than hand-retyping ~2000 lines of CSS.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function extractStyles(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const blocks = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(html))) blocks.push(m[1]);
  return blocks.join('\n\n');
}

// Split a CSS blob into individual top-level rules/blocks (naive brace matcher,
// good enough for this hand-authored, non-nested CSS) so we can dedupe by
// exact rule text across files.
function splitRules(css) {
  const rules = [];
  let depth = 0, start = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        rules.push(css.slice(start, i + 1).trim());
        start = i + 1;
      }
    }
  }
  return rules.filter(Boolean);
}

const kenilworth = extractStyles('golf-simulator-rental-kenilworth.html');
const indexCss = extractStyles('index.html');
const corporateCss = extractStyles('golf-simulator-corporate-events-chicago.html');
const barringtonCss = extractStyles('golf-simulator-bachelor-party-chicago.html'); // for .formats-grid etc.
const naperville = extractStyles('golf-simulator-rental-naperville.html'); // for .incl-grid, .courses-grid, .why-grid, .city-pills etc.
const locationsHub = extractStyles('locations.html'); // for .page-header, .stats-bar, .region-block, .location-card, .cta-banner

const seen = new Set();
const out = [];

// Every page now renders the SAME shared nav.njk/mobile-nav.njk/footer.njk
// partials (that's the whole point of the migration), so only Kenilworth's
// nav/footer rules should ever apply. Every other source file's own
// (now-orphaned) nav/footer CSS is excluded here — if it weren't, cascade
// order would let a later, unrelated page's nav styling silently override
// Kenilworth's and break the shared nav on every page (this happened during
// development: a later `.nav-links{gap:32px}` from locations.html overrode
// Kenilworth's `gap:4px` and broke nav layout site-wide).
const NAV_FOOTER_SELECTOR = /^(nav\b|\.nav-|\.mobile-nav|\.hamburger|footer\b|\.footer-)/;

function addBlock(label, css, { skipNavFooter = false } = {}) {
  const rules = splitRules(css);
  const kept = [];
  for (const r of rules) {
    const key = r.replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    if (skipNavFooter && NAV_FOOTER_SELECTOR.test(key)) continue;
    seen.add(key);
    kept.push(r);
  }
  if (kept.length) {
    out.push(`\n/* ============ ${label} ============ */\n` + kept.join('\n'));
  }
}

addBlock('BASE DESIGN SYSTEM (from Kenilworth — location page + shared nav/footer/buttons)', kenilworth);
addBlock('HOMEPAGE-ONLY COMPONENTS (marquee, carousel, popup, reviews, service-area pills, instagram row)', indexCss, { skipNavFooter: true });
addBlock('EVENT-PAGE-ONLY COMPONENTS (why/use-case/perks/packages)', corporateCss, { skipNavFooter: true });
addBlock('BACHELOR-PARTY-ONLY COMPONENTS (formats grid)', barringtonCss, { skipNavFooter: true });
addBlock('NAPERVILLE CUSTOM BLOCKS (features, courses, why-us, service-area widget)', naperville, { skipNavFooter: true });
addBlock('LOCATIONS HUB (page header, stats bar, region blocks, location cards, cta banner)', locationsHub, { skipNavFooter: true });

fs.mkdirSync(path.join(ROOT, 'src', 'css'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'src', 'css', 'main.css'), out.join('\n'));
console.log('Wrote src/css/main.css —', out.join('\n').split('\n').length, 'lines');
