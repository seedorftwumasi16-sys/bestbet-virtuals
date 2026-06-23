/**
 * Detect which API URL is baked into the live Vercel deployment.
 */
const SITE = process.env.SITE_URL || 'https://bestbet-virtuals.vercel.app';

async function main() {
  const html = await fetch(SITE).then((r) => r.text());
  const chunks = [...html.matchAll(/\/_next\/static\/chunks\/[a-zA-Z0-9_.-]+\.js/g)].map((m) => m[0]);
  const unique = [...new Set(chunks)].slice(0, 40);
  const hits = new Set();
  for (const chunk of unique) {
    const js = await fetch(SITE + chunk).then((r) => r.text()).catch(() => '');
    for (const pat of [/localhost:4000/g, /bestbet-api[^"'\\s]+/g, /NEXT_PUBLIC_API_URL/g]) {
      const m = js.match(pat);
      if (m) hits.add(`${chunk}: ${m[0]}`);
    }
  }
  console.log('Scanned', unique.length, 'chunks from', SITE);
  console.log([...hits].join('\n') || 'No API URL literals found in scanned chunks');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
