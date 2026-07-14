// Regenerates data/sample-feed.json — the offline fallback dataset used
// when the live APIs are unreachable during a demo. Run with:
//   node scripts/build-sample-feed.js
const fs = require('fs');
const path = require('path');
const { fetchEuropePMC, fetchOpenAlex, dedupe } = require('../lib/sources');

const ROOT = path.join(__dirname, '..');
const taxonomy = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'taxonomy.json'), 'utf8'));

// Query one tag at a time (not OR-batched) so every tag is guaranteed
// some cached coverage — a batched OR query lets common tags crowd rarer
// ones out of the fixed page size, leaving some tags with zero results.
const allTags = [...taxonomy.conditions];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const all = [];
  for (const tag of allTags) {
    console.log(`Fetching for: ${tag}`);
    const controller = new AbortController();
    try {
      const [epmc, oa] = await Promise.allSettled([
        fetchEuropePMC([tag], controller.signal),
        fetchOpenAlex([tag], controller.signal),
      ]);
      if (epmc.status === 'fulfilled') all.push(...epmc.value.slice(0, 10));
      else console.warn('  Europe PMC failed:', epmc.reason.message);
      if (oa.status === 'fulfilled') all.push(...oa.value.slice(0, 10));
      else console.warn('  OpenAlex failed:', oa.reason.message);
    } catch (err) {
      console.warn('  tag failed:', err.message);
    }
    await sleep(200); // be polite to the free APIs
  }

  const deduped = dedupe(all);
  const outPath = path.join(ROOT, 'data', 'sample-feed.json');
  fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2));
  console.log(`Wrote ${deduped.length} deduplicated articles to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
