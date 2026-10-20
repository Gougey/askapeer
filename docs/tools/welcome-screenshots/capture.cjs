/**
 * Regenerate the welcome guide's screenshots (`apps/web/public/guide/*.png`).
 *
 * Runs against a LOCAL stack with the seeded demo corpus — never live. The guide is public, so
 * every pixel in it must be fictional: the demo handles and posts are, a real member's are not.
 *
 *   npm run seed:demo -w apps/api            # the demo corpus
 *   npm run pilot -w apps/api -- allowlist add guide.capture@example.org
 *   npm run dev                               # API on :4000, web on :3000
 *   npm i playwright                          # anywhere outside the repo
 *   NODE_PATH=<that dir>/node_modules CHROMIUM=<path to a Chromium> \
 *     node docs/tools/welcome-screenshots/capture.cjs
 *
 * Signs in through the API's local-only dev token (`request-link` returns it when not in
 * production), so no mailbox is needed. iPhone 14 viewport, 2× — matching the guide's `SHOT`.
 */
const path = require('node:path');
const { chromium } = require('playwright');

const WEB = process.env.WEB ?? 'http://localhost:3000';
const API = process.env.API ?? 'http://localhost:4000/v1';
const OUT = path.resolve(__dirname, '../../../apps/web/public/guide');
const DEMO_EMAIL = 'tendontom@demo.askapeer.invalid';
const THREAD_TITLE = 'Sleep and injury risk in adolescent athletes';
/**
 * The applicant whose handle screen is captured. Invited locally (see above) so the pilot gate
 * approves it on registering; it only ever *types* a handle, never claims one, so the same
 * account reaches the handle screen on every run.
 */
const CAPTURE_EMAIL = 'guide.capture@example.org';

async function post(route, body) {
  const res = await fetch(`${API}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${route} ${res.status} ${await res.text()}`);
  return res.json();
}

async function session(email) {
  const { devToken } = await post('/auth/request-link', { email });
  if (!devToken) throw new Error('No dev token — is the API running locally, not in production?');
  return post('/auth/verify-link', { token: devToken });
}

async function signedIn(browser, email) {
  const { accessToken, refreshToken } = await session(email);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const url = new URL(WEB);
  await context.addCookies([
    { name: 'ap_access', value: accessToken, domain: url.hostname, path: '/' },
    { name: 'ap_refresh', value: refreshToken, domain: url.hostname, path: '/' },
  ]);
  return context;
}

/** The dev-only "open your sign-in link" shortcut must not appear in a guide for real members. */
async function hideDevAffordances(page) {
  await page.addStyleTag({ content: 'a[href*="/auth/verify"], [data-dev-only] { display: none !important; }' });
}

async function shot(page, name) {
  await page.waitForLoadState('networkidle');
  // Next's dev-mode badge, which a production build never shows.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.screenshot({ path: path.join(OUT, name) });
  console.log(`wrote ${name}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  try {
    // 1. Registration, filled in with an obviously fictional applicant.
    const anon = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    let page = await anon.newPage();
    await page.goto(`${WEB}/register`);
    await page.getByLabel(/Full name/).fill('Alex Example');
    await page.getByLabel(/^Email/).fill('alex.example@example.com');
    await page.getByLabel(/Registration number/).fill('PH123456');
    await shot(page, 'register.png');

    // 2. The code screen, as it looks after "Email me a sign-in link".
    page = await anon.newPage();
    await page.goto(WEB);
    await page.getByLabel(/^Email/).fill(DEMO_EMAIL);
    await page.getByRole('button', { name: /sign-in link/i }).click();
    await page.getByLabel(/six-digit code/i).waitFor();
    await hideDevAffordances(page);
    await page.getByLabel(/six-digit code/i).fill('482913');
    await shot(page, 'code.png');

    // 3. Choosing a handle: a fresh, approved member with no handle yet.
    await post('/auth/register', {
      legalName: 'Guide Capture',
      email: CAPTURE_EMAIL,
      professionalBody: 'hcpc',
      registrationNumber: 'GC000001',
    }).catch((err) => {
      // 409: registered on an earlier run, which is fine — it still has no handle.
      if (!String(err.message).includes(' 409 ')) throw err;
    });
    let ctx = await signedIn(browser, CAPTURE_EMAIL);
    page = await ctx.newPage();
    await page.goto(`${WEB}/onboarding/handle`);
    await page.getByLabel(/^Handle/).fill('QuietQuads');
    await page.getByText(/is available/).waitFor({ timeout: 10_000 }).catch(() => {});
    await shot(page, 'handle.png');
    await ctx.close();

    // 4–6. The app itself, as a demo member.
    ctx = await signedIn(browser, DEMO_EMAIL);
    page = await ctx.newPage();
    await page.goto(`${WEB}/discussions`);
    await shot(page, 'discussions.png');

    // Found by search rather than on the first page of the list, which changes as posts age.
    await page.goto(`${WEB}/search?q=${encodeURIComponent(THREAD_TITLE)}`);
    await page.getByText(THREAD_TITLE).first().click();
    await page.waitForURL(/\/discussions\/[0-9a-f-]+/);
    // The top of the thread: the question with its Insightful, Useful and Follow buttons.
    await shot(page, 'thread.png');

    await page.goto(`${WEB}/feed?f=1&q=${encodeURIComponent('hamstring rehabilitation')}`);
    await shot(page, 'research.png');
    await ctx.close();
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
