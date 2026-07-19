import { getRequestConfig } from 'next-intl/server';

// MVP is single-locale (en-GB). All UI strings resolve from the message catalog
// (`messages/en-GB.json`) — never hardcoded literals — so adding locales later is
// additive, not a retrofit.
export default getRequestConfig(async () => {
  const locale = 'en-GB';
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
