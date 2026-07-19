import createNextIntlPlugin from 'next-intl/plugin';

// Single-locale setup for MVP (en-GB); no locale routing yet. The message-catalog
// discipline (G-10) is in place so translations are additive later, not a retrofit.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);
