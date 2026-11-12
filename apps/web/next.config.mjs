import { readFileSync } from 'node:fs';
import createNextIntlPlugin from 'next-intl/plugin';

// The release number, from the root package.json: one version for the whole app.
const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

// Single-locale setup for MVP (en-GB); no locale routing yet. The message-catalog
// discipline (G-10) is in place so translations are additive later, not a retrofit.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a minimal self-contained server for the Docker/Fly image.
  output: 'standalone',
  // Inlined at build. The commit and build date arrive at runtime instead (GIT_SHA, BUILD_DATE),
  // stamped into the image by the deploy workflow.
  env: { APP_VERSION: version },
};

export default withNextIntl(nextConfig);
