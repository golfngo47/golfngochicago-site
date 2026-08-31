module.exports = function (eleventyConfig) {
  // Passthrough: static assets that don't need processing
  eleventyConfig.addPassthroughCopy({ 'src/css': 'css' });
  eleventyConfig.addPassthroughCopy('images');
  eleventyConfig.addPassthroughCopy('favicon.ico');
  eleventyConfig.addPassthroughCopy('favicon.png');
  eleventyConfig.addPassthroughCopy('gng-main-logo.svg');
  eleventyConfig.addPassthroughCopy('hero.mp4');
  eleventyConfig.addPassthroughCopy('robots.txt');
  eleventyConfig.addPassthroughCopy('404.html');
  eleventyConfig.addPassthroughCopy('og-preview.png');
  eleventyConfig.addPassthroughCopy('Icon 3 (1).png');

  // Explicitly out of scope this pass — untouched utility/admin tools
  eleventyConfig.addPassthroughCopy('admin.html');
  eleventyConfig.addPassthroughCopy('contest-app.html');
  eleventyConfig.addPassthroughCopy('leaderboard.html');
  eleventyConfig.addPassthroughCopy('register.html');

  eleventyConfig.addFilter('slugTitle', (slug) =>
    slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );

  // JSON-LD generators — built via JSON.stringify so apostrophes/quotes in
  // real copy (e.g. "Golf 'n Go") can never produce invalid/broken JSON,
  // unlike hand-typed inline <script> blocks did on the old site.
  eleventyConfig.addFilter('localBusinessSchema', (site, areaName) => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.name,
    description: `Mobile golf simulator rental serving ${areaName}, IL and the greater Chicagoland area.`,
    url: site.domain,
    telephone: '+1-708-264-4980',
    address: { '@type': 'PostalAddress', addressLocality: site.baseAddress.city, addressRegion: site.baseAddress.state, addressCountry: 'US' },
    areaServed: { '@type': 'City', name: `${areaName}, IL` },
    serviceType: 'Portable Golf Simulator Rental',
    openingHours: 'Mo-Su 08:00-22:00'
  }));

  eleventyConfig.addFilter('faqPageSchema', (faq) => JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (faq || []).map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a }
    }))
  }));

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      data: '_data',
      output: '_site'
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
