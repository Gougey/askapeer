/**
 * Addresses that are guaranteed not to exist, and must never be sent to.
 *
 * **A plain module with no imports**, so the send path and its check can both use it and a
 * guard can test it without a database — the same reasoning as `lib/evidence.ts` on the web.
 *
 * RFC 2606 and RFC 6761 reserve `.invalid`, `.test`, `.example` and `.localhost` precisely so
 * that nothing ever resolves them, and `example.com`/`.net`/`.org` for documentation. Handing
 * one to a mail provider is asking it to attempt a delivery that cannot succeed.
 *
 * ⚠️ **This is a sender-reputation control, not tidiness.** The seeded demo corpus gives 15
 * accounts at `@demo.askapeer.invalid`, and every notification to one of them bounced:
 * measured on live, 8 bounces in 81 sends — a **9.9% bounce rate**, against the ~10% at which
 * Postmark starts acting on a sender. Every real member's sign-in code travels on that
 * reputation, so a demo account must not be able to spend it.
 *
 * Checked by domain suffix rather than by listing the demo domain, because the next seed will
 * invent a different one and the rule is the same for all of them.
 */
const RESERVED_SUFFIXES = ['.invalid', '.test', '.example', '.localhost'];
const RESERVED_DOMAINS = ['example.com', 'example.net', 'example.org'];

export function isUndeliverable(address: string): boolean {
  const at = address.trim().lastIndexOf('@');
  // No `@`, or nothing before it: not an address at all, and nothing good comes of trying.
  if (at <= 0) return true;
  const domain = address.trim().slice(at + 1).trim().toLowerCase().replace(/\.$/, '');
  if (domain === '') return true;
  if (RESERVED_DOMAINS.includes(domain)) return true;
  return RESERVED_SUFFIXES.some((suffix) => domain === suffix.slice(1) || domain.endsWith(suffix));
}
