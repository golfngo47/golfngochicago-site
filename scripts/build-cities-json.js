// Assembles src/_data/cities.json from the raw extraction (24 standard pages +
// Naperville's base fields) plus hand-authored content for the 6 Wix-stub
// pages and Naperville's customBlocks. One-off migration script.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'raw-extracted-cities.json'), 'utf8'));

const NAME = {
  'aurora':'Aurora','barrington':'Barrington','buffalo-grove':'Buffalo Grove','burr-ridge':'Burr Ridge',
  'clarendon-hills':'Clarendon Hills','downers-grove':'Downers Grove','elmhurst':'Elmhurst','evanston':'Evanston',
  'frankfort':'Frankfort','glen-ellyn':'Glen Ellyn','glencoe':'Glencoe','glenview':'Glenview',
  'highland-park':'Highland Park','hinsdale':'Hinsdale','kenilworth':'Kenilworth','la-grange':'La Grange',
  'lake-forest':'Lake Forest','lake-zurich':'Lake Zurich','naperville':'Naperville','northbrook':'Northbrook',
  'oak-brook':'Oak Brook','oak-park':'Oak Park','orland-park':'Orland Park','plainfield':'Plainfield',
  'schaumburg':'Schaumburg','tinley-park':'Tinley Park','western-springs':'Western Springs','wheaton':'Wheaton',
  'wilmette':'Wilmette','winnetka':'Winnetka','yorkville':'Yorkville'
};

const REGION = {
  'kenilworth':'the North Shore','highland-park':'the North Shore','lake-forest':'the North Shore',
  'wilmette':'the North Shore','winnetka':'the North Shore','evanston':'the North Shore',
  'northbrook':'the North Shore','glencoe':'the North Shore','glenview':'the North Shore',
  'buffalo-grove':'the northwest suburbs','lake-zurich':'the northwest suburbs','barrington':'the northwest suburbs',
  'schaumburg':'the northwest suburbs',
  'hinsdale':'the western suburbs','oak-brook':'the western suburbs','burr-ridge':'the western suburbs',
  'clarendon-hills':'the western suburbs','downers-grove':'the western suburbs','elmhurst':'the western suburbs',
  'western-springs':'the western suburbs','la-grange':'the western suburbs','glen-ellyn':'the western suburbs',
  'wheaton':'the western suburbs','oak-park':'the western suburbs',
  'naperville':'the western suburbs','aurora':'the western suburbs','yorkville':'the far west suburbs',
  'plainfield':'the southwest suburbs','orland-park':'the southwest suburbs','tinley-park':'the southwest suburbs',
  'frankfort':'the southwest suburbs'
};

function filename(imgPath) {
  if (!imgPath) return null;
  return imgPath.replace(/^images\//, '');
}

const cities = [];

for (const slug of Object.keys(raw)) {
  if (slug === 'naperville') continue; // handled separately below with customBlocks
  const r = raw[slug];
  if (r.isWixStub) continue; // hand-authored below
  cities.push({
    slug,
    name: NAME[slug],
    region: REGION[slug] || 'Chicagoland',
    metaTitle: r.title,
    metaDescription: r.metaDescription,
    ogDescription: r.ogDescription || r.metaDescription,
    heroImage: filename(r.heroImg),
    eventImage: filename(r.eventImg),
    introParagraphs: r.introParagraphs,
    eventCards: r.eventCards,
    faq: r.faq,
    nearbyTowns: r.nearbyTowns,
    customBlocks: null
  });
}

// ---- Hand-authored: 6 Wix-stub cities ----
const STANDARD_EVENT_CARDS = (city) => ([
  { icon:'🏢', title:'Corporate Events', desc:`${city}'s business community turns to Golf 'n Go for team-building days and client-entertainment events that actually get talked about afterward.` },
  { icon:'🎂', title:'Birthday Parties', desc:`Celebrate in ${city} with a party activity built for every guest — golfers and non-golfers alike get pulled in from the first swing.` },
  { icon:'🎓', title:'Graduations', desc:`Mark a ${city} graduate's achievement with an entertainment centerpiece that keeps the whole party engaged, not just watching.` },
  { icon:'🎉', title:'Private Parties', desc:`${city} hosts trust us to fit the simulator into backyards, basements, and living rooms — we handle every detail of setup and breakdown.` },
  { icon:'⛳', title:'Bachelor Parties', desc:`Open a ${city} bachelor party with 18 holes at Augusta or Pebble Beach before heading out for the night.` }
]);
const STANDARD_FAQ = (city, region) => ([
  { q:`How much does golf simulator rental cost in ${city}?`, a:`Pricing depends on event duration, guest count, and location. We provide flat-rate packages with no hidden fees. Submit our quote form and we'll respond with a custom ${city} proposal within hours.` },
  { q:`Do you travel to ${city}?`, a:`Yes — we serve ${city} and ${region}. A travel surcharge may apply depending on distance from our Orland Park base. Call (708) 264-4980 for exact pricing for your ${city} event.` },
  { q:'How much space is needed for the simulator?', a:'Our inflatable enclosure needs roughly 20×20 feet with 11 feet of ceiling clearance. The compact indoor setup requires 15×10 feet with 9 feet of height. Both configurations deliver the full simulator experience.' },
  { q:`Can Golf 'n Go set up at a ${city} private residence?`, a:`Absolutely. Our team arrives on time, sets up professionally, and operates cleanly throughout your event — a great fit for ${city} backyards, basements, and driveways.` }
]);

const STUBS = {
  'barrington': {
    metaTitle: "Golf Simulator Rental Barrington IL | Golf 'n Go Chicago",
    metaDescription: "Golf simulator rental in Barrington, IL. Golf 'n Go Chicago brings a premium mobile golf simulator experience — 2,300+ courses — to your corporate event, birthday, or backyard party. Call (708) 264-4980.",
    intro: [
      "Barrington is one of Chicago's most sought-after northwest suburbs — known for its equestrian estates, vibrant downtown, and tight community spirit. Golf 'n Go Chicago brings that same premium feel to your next event, delivering a genuinely world-class mobile golf simulator experience right to your Barrington venue.",
      "Our GSPro-powered simulator places guests on 2,300+ legendary courses — Pebble Beach, Augusta National, St. Andrews — on a 100-inch screen with launch-monitor precision. Whether it's a corporate team-building day, a milestone birthday, or a backyard gathering, every guest gets pulled into the fun. We handle setup, operation, and breakdown from start to finish, and our system fits Barrington's wide-open properties, barns, and event spaces with ease."
    ],
    nearby: ['lake-zurich', 'buffalo-grove', 'schaumburg', 'northbrook']
  },
  'burr-ridge': {
    metaTitle: "Golf Simulator Rental Burr Ridge IL | Golf 'n Go Chicago",
    metaDescription: "Golf simulator rental in Burr Ridge, IL. Golf 'n Go Chicago delivers a premium portable golf simulator experience — 2,300+ courses — to your corporate event, birthday, or private party. Call (708) 264-4980.",
    intro: [
      "Burr Ridge is one of the Chicago area's most prestigious addresses — home to executive-level professionals, custom estate homes, and a community that appreciates the finer things. Golf 'n Go Chicago brings that same premium standard to your next event, delivering a world-class mobile golf simulator experience right to your Burr Ridge venue.",
      "Our GSPro-powered simulator features 2,300+ world-famous courses rendered on a 100-inch screen with launch-monitor precision, from Pebble Beach to Augusta National. We take care of every detail — setup, operation, and teardown — and our system fits Burr Ridge's spacious homes, gated properties, and upscale event venues with ease."
    ],
    nearby: ['hinsdale', 'western-springs', 'la-grange', 'downers-grove']
  },
  'clarendon-hills': {
    metaTitle: "Golf Simulator Rental Clarendon Hills IL | Golf 'n Go Chicago",
    metaDescription: "Golf simulator rental in Clarendon Hills, IL. Golf 'n Go Chicago brings a premium mobile golf simulator experience — 2,300+ courses — to your next event. Call (708) 264-4980.",
    intro: [
      "Clarendon Hills is a tight-knit western suburb with a strong community spirit and beautiful tree-lined neighborhoods — exactly the kind of setting where a Golf 'n Go event becomes the thing everyone's still talking about the next day.",
      "Our GSPro-powered simulator delivers 2,300+ world-famous courses on a 100-inch screen with launch-monitor precision. Setup typically takes 45 minutes and breakdown is quick and clean — our equipment fits Clarendon Hills backyards, garages, and community spaces without any hassle for the host."
    ],
    nearby: ['hinsdale', 'burr-ridge', 'downers-grove', 'western-springs']
  },
  'glencoe': {
    metaTitle: "Golf Simulator Rental Glencoe IL | Golf 'n Go Chicago",
    metaDescription: "Golf simulator rental in Glencoe, IL. Premium mobile golf entertainment — 2,300+ courses — for the North Shore's most refined events. Call (708) 264-4980.",
    intro: [
      "Glencoe is one of Chicago's most beautiful North Shore villages — lakefront bluffs, the Chicago Botanic Garden, and a community with genuinely refined taste in how it celebrates. Golf 'n Go Chicago meets that standard with a mobile golf simulator experience built for Glencoe's best events.",
      "Our GSPro-powered simulator delivers photo-realistic renderings of 2,300+ world-famous courses on a 100-inch screen with launch-monitor precision. We handle the full setup in about 45 minutes and run the experience start to finish — a premium entertainment centerpiece for corporate gatherings, milestone birthdays, and private parties alike."
    ],
    nearby: ['winnetka', 'highland-park', 'northbrook', 'lake-forest']
  },
  'glenview': {
    metaTitle: "Golf Simulator Rental Glenview IL | Golf 'n Go Chicago",
    metaDescription: "Golf simulator rental in Glenview, IL. Golf 'n Go Chicago brings a premium mobile golf simulator experience — 2,300+ courses — to your corporate event or party. Call (708) 264-4980.",
    intro: [
      "Glenview is a thriving north suburb with a strong corporate presence and a genuine community events scene — from The Glen to backyard block parties. Golf 'n Go Chicago brings a mobile golf simulator experience that fits right into both.",
      "Our GSPro-powered simulator puts guests on 2,300+ world-famous courses on a 100-inch screen with launch-monitor precision, and a live leaderboard feature that makes it a natural fit for competitive corporate groups and party crowds alike. We handle setup, operation, and breakdown so you don't have to think about a thing."
    ],
    nearby: ['northbrook', 'wilmette', 'highland-park', 'evanston']
  },
  'schaumburg': {
    metaTitle: "Golf Simulator Rental Schaumburg IL | Golf 'n Go Chicago",
    metaDescription: "Golf simulator rental in Schaumburg, IL. Golf 'n Go Chicago brings a premium mobile golf simulator experience — 2,300+ courses — to your corporate event, conference, or party. Call (708) 264-4980.",
    intro: [
      "Schaumburg is one of the Chicago area's premier corporate hubs — hotel ballrooms, conference centers, and a business calendar that never really slows down. Golf 'n Go Chicago brings a mobile golf simulator experience built for exactly that kind of event.",
      "Our GSPro-powered simulator delivers 2,300+ world-famous courses on a 100-inch screen with launch-monitor precision — a genuine conversation-starter for client entertainment, trade-show hospitality suites, and team offsites. We handle every detail of setup, operation, and breakdown across banquet halls, corporate offices, and outdoor pavilions alike."
    ],
    nearby: ['buffalo-grove', 'lake-zurich', 'elmhurst', 'oak-brook']
  }
};

for (const [slug, data] of Object.entries(STUBS)) {
  const name = NAME[slug];
  cities.push({
    slug,
    name,
    region: REGION[slug],
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    ogDescription: data.metaDescription,
    heroImage: null,
    eventImage: null,
    introParagraphs: data.intro,
    eventCards: STANDARD_EVENT_CARDS(name),
    faq: STANDARD_FAQ(name, REGION[slug]),
    nearbyTowns: data.nearby,
    customBlocks: null
  });
}

// ---- Naperville: base fields from extraction + hand-captured customBlocks ----
const nap = raw.naperville;
cities.push({
  slug: 'naperville',
  name: 'Naperville',
  region: 'the western suburbs',
  metaTitle: nap.title,
  metaDescription: nap.metaDescription,
  ogDescription: nap.ogDescription || nap.metaDescription,
  heroImage: filename(nap.heroImg) || 'naperville-hero.jpg',
  eventImage: 'naperville-event.jpg',
  introParagraphs: nap.introParagraphs,
  eventCards: nap.eventCards,
  faq: nap.faq,
  nearbyTowns: [],
  customBlocks: {
    fontAwesome: true,
    features: [
      { icon:'fa-solid fa-earth-americas', title:'2,300+ World Courses', desc:'Play the most iconic courses on the planet at your event.' },
      { icon:'fa-solid fa-bullseye', title:'Long Drive Challenge', desc:'See who can crush it the farthest. Perfect for competition.' },
      { icon:'fa-solid fa-flag', title:'Closest to the Pin', desc:'Test your accuracy and settle the debate once and for all.' },
      { icon:'fa-solid fa-star', title:'Hole in One Challenge', desc:'Everyone gets their shot at glory and event prizes.' },
      { icon:'fa-solid fa-gamepad', title:'Golf Arcade Mini-Games', desc:'Cup Pong, Darts and more for non-golfers and beginners.' },
      { icon:'fa-solid fa-users-rectangle', title:'Multiplayer Mode', desc:'Up to 8 players simultaneously — perfect for groups.' },
      { icon:'fa-solid fa-desktop', title:'4K Projector', desc:'High-resolution visuals for a fully immersive experience.' },
      { icon:'fa-solid fa-satellite-dish', title:'FlightScope Mevo+', desc:'Industry-leading launch monitor tracking technology.' },
      { icon:'fa-solid fa-sliders', title:'GSPro Software', desc:'The most advanced golf simulation software available.' },
      { icon:'fa-solid fa-house-chimney', title:'Indoor & Outdoor', desc:'Flexible setup options for your perfect event venue.' }
    ],
    courses: [
      { name:'Pebble Beach', loc:'California, USA', img:'course-pebble-beach.jpg' },
      { name:'Augusta National', loc:'Georgia, USA', img:'course-augusta-national.jpg' },
      { name:'St Andrews', loc:'Fife, Scotland', img:'course-st-andrews.jpg' },
      { name:'Torrey Pines', loc:'San Diego, CA', img:'course-torrey-pines.jpg' },
      { name:'Whistling Straits', loc:'Kohler, WI', img:'course-whistling-straits.jpg' },
      { name:'Bethpage Black', loc:'Farmingdale, NY', img:'course-bethpage-black.jpg' },
      { name:'TPC Sawgrass', loc:'Ponte Vedra, FL', img:'course-tpc-sawgrass.jpg' },
      { name:'Oakmont', loc:'Oakmont, PA', img:'course-oakmont.jpg' }
    ],
    whyUs: {
      label: 'Why Naperville Chooses Golf \'n Go',
      heading: 'Local. Reliable. Unforgettable.',
      body: "We're based nearby in Orland Park and proudly serve Naperville with the highest-rated mobile golf simulator experience in Chicagoland. From Downtown Naperville to North Naperville, we guarantee on-time arrival and premium equipment.",
      checklist: [
        '5.0★ Google Rating & Top-Rated Reviews',
        'On-Time Arrival & White-Glove Setup',
        'Professional Setup & Attendant Operation',
        'Hundreds of 5-Star Reviews in Chicagoland'
      ],
      image: 'naperville-party.jpg',
      testimonial: 'The highlight of our Naperville neighborhood block party! Setup was fast and everyone loved it.'
    },
    serviceAreaWidget: {
      mapEmbedQuery: 'Naperville, IL',
      linkedTowns: ['aurora','plainfield','wheaton','downers-grove','glen-ellyn','oak-brook','hinsdale','elmhurst','western-springs','la-grange','yorkville','orland-park','tinley-park'],
      unlinkedTowns: ['Oswego','Bolingbrook','Lisle','Woodridge','Darien'],
      zipCodes: ['60540','60563','60564','60565']
    }
  }
});

// sort alphabetically by slug for a stable, diffable file
cities.sort((a, b) => a.slug.localeCompare(b.slug));

const outDir = path.join(ROOT, 'src', '_data');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'cities.json'), JSON.stringify(cities, null, 2));
console.log(`Wrote src/_data/cities.json with ${cities.length} cities`);

// sanity checks
const slugs = new Set(cities.map(c => c.slug));
for (const c of cities) {
  for (const nb of c.nearbyTowns) {
    if (!slugs.has(nb)) console.warn(`WARN: ${c.slug} nearbyTowns references unknown slug "${nb}"`);
  }
}
if (cities.length !== 31) console.warn(`WARN: expected 31 cities, got ${cities.length}`);
