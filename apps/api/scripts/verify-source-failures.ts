/**
 * A source whose every request fails has failed, not found nothing.
 *
 * On 29 October 2026 Europe PMC's 12:00 run fetched 0 papers across all 19 queries, while the
 * same window returned 56 for "physiotherapy" alone. Each failed request had been caught,
 * logged and turned into an empty list, so the run recorded "0 seen", no error, and moved its
 * cursor on. OpenAlex did the same. Both sources now count failed queries
 * (`queryFailureOutcome`): all failing throws, so the run records the error and keeps its
 * cursor; some failing is kept as the source's `last_error`.
 *
 * No database and no network: `fetch` is stubbed, and the real source classes are driven.
 *
 * Run: npm run verify:source-failures -w apps/api
 */
import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import type { ConfigService } from '@nestjs/config';
import { queryFailureOutcome } from '../src/research-feed/sources/article-source';
import { EuropePmcSource } from '../src/research-feed/sources/europe-pmc.source';
import { OpenAlexSource } from '../src/research-feed/sources/open-alex.source';

let failures = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`pass  ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${name}\n      ${(error as Error).message.split('\n')[0]}`);
  }
}

/** Answer each request by whether its URL mentions a query we want to fail. */
function stubFetch(failing: (url: string) => boolean): void {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = decodeURIComponent(String(input).replace(/\+/g, " "));
    if (failing(url)) return new Response('busy', { status: 503 });
    return new Response(JSON.stringify({ resultList: { result: [] }, results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

const QUERIES = ['physiotherapy', 'low back pain', 'tendinopathy'];
const config = { get: () => 'test-key' } as unknown as ConfigService;
const sources = [new EuropePmcSource(), new OpenAlexSource(config)];

(async () => {
  // --- The rule itself.
  await check('no failures records nothing (and clears an earlier error)', () => {
    assert.deepEqual(queryFailureOutcome(19, []), { fatal: false, message: null });
  });
  await check('every query failing is fatal', () => {
    const outcome = queryFailureOutcome(19, QUERIES.map((query) => ({ query, message: 'HTTP 503' })).concat(
      Array.from({ length: 16 }, (_, i) => ({ query: `q${i}`, message: 'HTTP 503' })),
    ));
    assert.equal(outcome.fatal, true);
    assert.match(outcome.message ?? '', /^all 19 queries failed; first: "physiotherapy": HTTP 503$/);
  });
  await check('some failing is recorded but not fatal', () => {
    const outcome = queryFailureOutcome(19, [{ query: 'rotator cuff', message: 'fetch failed' }]);
    assert.equal(outcome.fatal, false);
    assert.equal(outcome.message, '1 of 19 queries failed; first: "rotator cuff": fetch failed');
  });

  // --- The sources, driven for real against a stubbed network.
  for (const source of sources) {
    await check(`${source.name}: every request failing throws instead of returning nothing`, async () => {
      stubFetch(() => true);
      await assert.rejects(source.fetchSince('2026-10-29', QUERIES), /all 3 queries failed/);
    });
    await check(`${source.name}: one failing query is reported, the rest still run`, async () => {
      stubFetch((url) => url.includes('low back pain'));
      const result = await source.fetchSince('2026-10-29', QUERIES);
      assert.match(result.partialError ?? '', /^1 of 3 queries failed; first: "low back pain"/);
      assert.ok(result.nextCursor, 'cursor still advances on a partial run');
    });
    await check(`${source.name}: a clean run reports no error`, async () => {
      stubFetch(() => false);
      const result = await source.fetchSince('2026-10-29', QUERIES);
      assert.equal(result.partialError, null);
    });
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nall source-failure checks passed');
})();
